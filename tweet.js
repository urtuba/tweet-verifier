// Turn a tweet URL into tweet data, using X's public oEmbed endpoint
// (no API key, no login). Everything here is plain functions so it can be
// unit-tested; test/tweet.test.js covers the pure parts.
//
// Tweet content is untrusted. The oEmbed HTML is parsed with DOMParser and only
// text is taken from it. It is never inserted into the page as HTML.

export const OEMBED_URL = "https://publish.twitter.com/oembed";

// Snowflake IDs: (id >> 22) + this epoch is the tweet time in milliseconds.
const SNOWFLAKE_EPOCH = 1288834974657n;
// Tweets before this ID (November 2010) used sequential IDs, not snowflakes.
const FIRST_SNOWFLAKE_ID = 29700859247n;

const TWEET_HOSTS = new Set([
    "twitter.com", "www.twitter.com", "mobile.twitter.com",
    "x.com", "www.x.com", "mobile.x.com",
]);

const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

/** An error whose message is safe and clear enough to show to the visitor. */
export class TweetError extends Error {
    constructor(message) {
        super(message);
        this.name = "TweetError";
    }
}

/**
 * Read a twitter.com or x.com status URL.
 * Returns { id, url } (url is the canonical https://x.com/<user>/status/<id>) or null.
 */
export function parseTweetUrl(input) {
    if (typeof input !== "string") return null;
    let text = input.trim();
    if (text === "" || /\s/.test(text)) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = "https://" + text;

    let url;
    try {
        url = new URL(text);
    } catch (error) {
        return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!TWEET_HOSTS.has(url.hostname.toLowerCase())) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    // /<user>/status/<id>[/...]  or  /i/status/<id>  or  /i/web/status/<id>
    let user, id;
    if (parts.length >= 3 && /^status(es)?$/i.test(parts[1])) {
        [user, , id] = parts;
    } else if (parts.length >= 4 && parts[0] === "i" && parts[1] === "web" && /^status(es)?$/i.test(parts[2])) {
        user = "i";
        id = parts[3];
    } else {
        return null;
    }
    if (!/^\w{1,15}$/.test(user)) return null;
    if (!/^\d{1,19}$/.test(id)) return null;

    id = BigInt(id).toString(); // drop leading zeros
    if (id === "0") return null;
    return { id, url: `https://x.com/${user}/status/${id}` };
}

/**
 * Tweet time in milliseconds since 1970, read from the snowflake tweet ID.
 * Returns null for IDs from before November 2010, which are not snowflakes.
 */
export function tweetTimeFromId(id) {
    let value;
    try {
        value = BigInt(id);
    } catch (error) {
        return null;
    }
    if (value < FIRST_SNOWFLAKE_ID) return null;
    return Number((value >> 22n) + SNOWFLAKE_EPOCH);
}

/**
 * Read a date such as "March 21, 2006" (the text oEmbed puts in the tweet link).
 * Returns milliseconds at 00:00 UTC of that day, or null.
 */
export function parseOembedDate(text) {
    const match = /^\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*$/.exec(text || "");
    if (!match) return null;
    const month = MONTHS.indexOf(match[1].toLowerCase());
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (month < 0 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
    return date.getTime();
}

/**
 * Take the tweet text and the date text out of the oEmbed HTML.
 * `ParserClass` is DOMParser in the browser (tests pass another implementation).
 */
export function parseOembedHtml(html, ParserClass = globalThis.DOMParser) {
    if (typeof ParserClass !== "function") throw new Error("No HTML parser available");
    const doc = new ParserClass().parseFromString(String(html), "text/html");

    const paragraph = doc.querySelector("p");
    if (!paragraph) return { message: "", dateText: "" };
    for (const br of paragraph.querySelectorAll("br")) br.replaceWith("\n");
    const message = (paragraph.textContent || "").trim();

    // The last link of the blockquote holds the date.
    const links = doc.querySelectorAll("blockquote a");
    const dateText = links.length ? (links[links.length - 1].textContent || "").trim() : "";
    return { message, dateText };
}

/** "https://x.com/jack" -> "jack" */
function nickFromAuthorUrl(authorUrl) {
    try {
        const parts = new URL(authorUrl).pathname.split("/").filter(Boolean);
        return parts[0] || "";
    } catch (error) {
        return "";
    }
}

/**
 * Turn an oEmbed JSON response into the fields saved in the contract.
 * `time` is in milliseconds; `timeNote` explains where it came from.
 */
export function tweetFromOembed(data, id, ParserClass) {
    if (!data || typeof data.author_name !== "string" || typeof data.author_url !== "string" || typeof data.html !== "string") {
        throw new TweetError("X sent an answer this page does not understand.");
    }
    const { message, dateText } = parseOembedHtml(data.html, ParserClass);
    const nick = nickFromAuthorUrl(data.author_url);
    if (message === "" || nick === "") {
        throw new TweetError("This tweet has no text this page can read (for example, it may only contain media).");
    }

    let time = tweetTimeFromId(id);
    let timeNote = "Time taken from the tweet ID.";
    if (time === null) {
        const dateOnly = parseOembedDate(dateText);
        if (dateOnly === null) {
            time = 0;
            timeNote = "This tweet is older than November 2010 and X gave no date, so the time is saved as 0.";
        } else {
            time = dateOnly;
            timeNote = "This tweet is older than November 2010, so only the date is known (00:00 UTC of that day).";
        }
    }

    return {
        id,
        time,
        timeNote,
        message,
        name: data.author_name,
        nick,
        verified: false, // oEmbed does not tell
    };
}

/**
 * Fetch a tweet from oEmbed. `input` is what the visitor typed.
 * Throws TweetError with a message fit for the visitor.
 */
export async function fetchTweet(input, { fetchImpl = globalThis.fetch, ParserClass, timeoutMs = 15000 } = {}) {
    const parsed = parseTweetUrl(input);
    if (!parsed) {
        throw new TweetError("This is not a tweet URL. Use a link like https://x.com/jack/status/20 (twitter.com links work too).");
    }

    const endpoint = `${OEMBED_URL}?url=${encodeURIComponent(parsed.url)}&omit_script=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetchImpl(endpoint, { signal: controller.signal });
    } catch (error) {
        throw new TweetError("Could not reach X (publish.twitter.com). Check your connection and try again.");
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        // The body of an error is an HTML page; it is not read.
        if (response.status === 404) throw new TweetError("Tweet not found. It may be deleted or private, or the URL is wrong.");
        if (response.status === 403) throw new TweetError("X does not give out this tweet (it may be protected or restricted).");
        if (response.status === 429) throw new TweetError("X is limiting requests right now. Wait a minute and try again.");
        throw new TweetError(`X answered with an error (HTTP ${response.status}). Try again later.`);
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new TweetError("X sent an answer this page does not understand.");
    }
    return tweetFromOembed(data, parsed.id, ParserClass);
}

/** A record id is a bytes32 value: 0x followed by 64 hex digits. */
export function isRecordId(input) {
    return typeof input === "string" && /^0x[0-9a-fA-F]{64}$/.test(input.trim());
}

function formatDate(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

/** Block timestamp (seconds since 1970, as a string or number) -> "2026-10-09 17:00:00 UTC" */
export function formatSeconds(seconds) {
    const value = Number(seconds);
    if (!Number.isSafeInteger(value) || value <= 0) return "unknown";
    return formatDate(value * 1000) || "unknown";
}

/**
 * Tweet time (milliseconds since 1970, as a string or number) as saved by this page.
 * 0 means unknown. An old tweet saved with only its date shows just the date.
 */
export function formatMillis(millis) {
    const value = Number(millis);
    if (!Number.isSafeInteger(value) || value <= 0) return "unknown";
    const text = formatDate(value);
    if (text === null) return "unknown";
    const oldTweet = value < 1288834974657;
    if (oldTweet && value % 86400000 === 0) return text.slice(0, 10) + " (date only)";
    return text;
}
