import { expect } from "chai";
import { DOMParser } from "linkedom";
import {
  TweetError,
  fetchTweet,
  parseOembedDate,
  parseOembedHtml,
  parseTweetUrl,
  tweetFromOembed,
  tweetTimeFromId,
} from "../tweet.js";

// Shape of a real response from publish.twitter.com/oembed (https://x.com/jack/status/20).
const JACK_20 = {
  url: "https://x.com/jack/status/20",
  author_name: "jack",
  author_url: "https://x.com/jack",
  html:
    '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">just setting up my twttr</p>' +
    '&mdash; jack (@jack) <a href="https://x.com/jack/status/20?ref_src=twsrc%5Etfw">March 21, 2006</a></blockquote>\n\n',
  type: "rich",
};

const ELON = {
  author_name: "Elon Musk",
  author_url: "https://x.com/elonmusk",
  html:
    '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Next I’m buying Coca-Cola to put the cocaine back in</p>' +
    '&mdash; Elon Musk (@elonmusk) <a href="https://x.com/elonmusk/status/1519480761749016577?ref_src=twsrc%5Etfw">April 28, 2022</a></blockquote>\n\n',
};

const fakeFetch = (status, body) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body instanceof Error) throw body;
    return body;
  },
});

describe("parseTweetUrl", () => {
  it("accepts x.com and twitter.com status URLs", () => {
    expect(parseTweetUrl("https://x.com/jack/status/20")).to.deep.equal({ id: "20", url: "https://x.com/jack/status/20" });
    expect(parseTweetUrl("https://twitter.com/jack/status/20")).to.deep.equal({ id: "20", url: "https://x.com/jack/status/20" });
    expect(parseTweetUrl("https://www.twitter.com/jack/status/20")).to.deep.equal({ id: "20", url: "https://x.com/jack/status/20" });
    expect(parseTweetUrl("https://mobile.twitter.com/jack/status/20")).to.deep.equal({ id: "20", url: "https://x.com/jack/status/20" });
  });

  it("accepts a URL without a scheme, with spaces around it, query, fragment, trailing path", () => {
    const expected = { id: "20", url: "https://x.com/jack/status/20" };
    expect(parseTweetUrl("x.com/jack/status/20")).to.deep.equal(expected);
    expect(parseTweetUrl("  https://x.com/jack/status/20  ")).to.deep.equal(expected);
    expect(parseTweetUrl("https://x.com/jack/status/20?s=20&t=abc#top")).to.deep.equal(expected);
    expect(parseTweetUrl("https://x.com/jack/status/20/photo/1")).to.deep.equal(expected);
    expect(parseTweetUrl("https://x.com/jack/status/20/")).to.deep.equal(expected);
  });

  it("accepts the /i/status and /i/web/status forms", () => {
    expect(parseTweetUrl("https://x.com/i/status/20")).to.deep.equal({ id: "20", url: "https://x.com/i/status/20" });
    expect(parseTweetUrl("https://x.com/i/web/status/20")).to.deep.equal({ id: "20", url: "https://x.com/i/status/20" });
  });

  it("keeps a long snowflake ID exact", () => {
    expect(parseTweetUrl("https://x.com/elonmusk/status/1519480761749016577").id).to.equal("1519480761749016577");
  });

  it("rejects everything else", () => {
    for (const bad of [
      "",
      "   ",
      "hello",
      "0x03503908a8e17bc2ecdf5962ba0b032f6fca61080ec046755c6eb7fe4134756e",
      "https://x.com/jack",
      "https://x.com/jack/status/",
      "https://x.com/jack/status/abc",
      "https://x.com/jack/status/0",
      "https://x.com/jack/status/12345678901234567890123",
      "https://x.com/jack/likes/20",
      "https://example.com/jack/status/20",
      "https://x.com.evil.example/jack/status/20",
      "https://evil.example/x.com/jack/status/20",
      "https://notx.com/jack/status/20",
      "ftp://x.com/jack/status/20",
      "javascript:alert(1)",
      "https://x.com/jack name/status/20",
      "https://x.com/waytoolongusername1234/status/20",
    ]) {
      expect(parseTweetUrl(bad), JSON.stringify(bad)).to.equal(null);
    }
    expect(parseTweetUrl(undefined)).to.equal(null);
    expect(parseTweetUrl(20)).to.equal(null);
  });
});

describe("tweetTimeFromId", () => {
  it("reads the time out of a snowflake ID", () => {
    expect(tweetTimeFromId("1519480761749016577")).to.equal(1651107418845); // 2022-04-28
  });

  it("starts at the first snowflake ID (4 November 2010)", () => {
    expect(tweetTimeFromId("29700859247")).to.equal(1288834981738);
  });

  it("returns null for older, sequential IDs", () => {
    expect(tweetTimeFromId("20")).to.equal(null);
    expect(tweetTimeFromId("29700859246")).to.equal(null);
  });

  it("returns null for something that is not a number", () => {
    expect(tweetTimeFromId("abc")).to.equal(null);
  });
});

describe("parseOembedDate", () => {
  it("reads an English date as 00:00 UTC", () => {
    expect(parseOembedDate("March 21, 2006")).to.equal(Date.UTC(2006, 2, 21));
    expect(parseOembedDate("December 1, 2009")).to.equal(Date.UTC(2009, 11, 1));
  });

  it("returns null for anything else", () => {
    expect(parseOembedDate("")).to.equal(null);
    expect(parseOembedDate("21 Mart 2006")).to.equal(null);
    expect(parseOembedDate("February 30, 2006")).to.equal(null);
    expect(parseOembedDate(undefined)).to.equal(null);
  });
});

describe("parseOembedHtml", () => {
  it("takes the text of the first paragraph and the date text", () => {
    expect(parseOembedHtml(JACK_20.html, DOMParser)).to.deep.equal({
      message: "just setting up my twttr",
      dateText: "March 21, 2006",
    });
  });

  it("decodes entities, keeps line breaks and the text of links", () => {
    const html =
      '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">a &amp; b &lt;3<br>line two <a href="https://t.co/x">pic.twitter.com/x</a></p>' +
      '&mdash; N (@n) <a href="https://x.com/n/status/1">May 1, 2020</a></blockquote>';
    const { message } = parseOembedHtml(html, DOMParser);
    expect(message).to.equal("a & b <3\nline two pic.twitter.com/x");
  });

  it("never returns markup: a script or tag in the tweet stays text or is dropped", () => {
    const html =
      '<blockquote><p>hi <img src=x onerror="alert(1)"><script>alert(2)</script><b>bold</b></p>' +
      '<a href="javascript:alert(3)">June 2, 2020</a></blockquote>';
    const { message, dateText } = parseOembedHtml(html, DOMParser);
    expect(message).to.not.include("<");
    expect(message).to.not.include("onerror");
    expect(dateText).to.equal("June 2, 2020");
  });

  it("returns empty strings when there is no paragraph", () => {
    expect(parseOembedHtml("<blockquote></blockquote>", DOMParser)).to.deep.equal({ message: "", dateText: "" });
  });
});

describe("tweetFromOembed", () => {
  it("builds the record fields for a snowflake tweet", () => {
    expect(tweetFromOembed(ELON, "1519480761749016577", DOMParser)).to.deep.equal({
      id: "1519480761749016577",
      time: 1651107418845,
      timeNote: "Time taken from the tweet ID.",
      message: "Next I’m buying Coca-Cola to put the cocaine back in",
      name: "Elon Musk",
      nick: "elonmusk",
      verified: false,
    });
  });

  it("uses the date of the oEmbed HTML for a tweet from before November 2010", () => {
    const tweet = tweetFromOembed(JACK_20, "20", DOMParser);
    expect(tweet.time).to.equal(Date.UTC(2006, 2, 21));
    expect(tweet.timeNote).to.include("only the date");
    expect(tweet.nick).to.equal("jack");
  });

  it("saves time 0 with a note when an old tweet has no readable date", () => {
    const data = { ...JACK_20, html: "<blockquote><p>old</p></blockquote>" };
    const tweet = tweetFromOembed(data, "20", DOMParser);
    expect(tweet.time).to.equal(0);
    expect(tweet.timeNote).to.include("saved as 0");
  });

  it("rejects answers it does not understand", () => {
    expect(() => tweetFromOembed(null, "20", DOMParser)).to.throw(TweetError);
    expect(() => tweetFromOembed({ author_name: "x" }, "20", DOMParser)).to.throw(TweetError);
    expect(() => tweetFromOembed({ ...JACK_20, html: "<blockquote></blockquote>" }, "20", DOMParser)).to.throw(TweetError, /no text/);
  });
});

describe("fetchTweet", () => {
  const options = (status, body) => ({ fetchImpl: fakeFetch(status, body), ParserClass: DOMParser });

  it("asks oEmbed for the canonical URL and returns the tweet", async () => {
    let requested;
    const fetchImpl = async (url) => {
      requested = url;
      return { ok: true, status: 200, json: async () => JACK_20 };
    };
    const tweet = await fetchTweet("https://twitter.com/jack/status/20?s=20", { fetchImpl, ParserClass: DOMParser });
    expect(requested).to.equal("https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20&omit_script=1");
    expect(tweet.message).to.equal("just setting up my twttr");
  });

  it("rejects a bad URL without calling the network", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
    };
    try {
      await fetchTweet("not a tweet", { fetchImpl, ParserClass: DOMParser });
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).to.be.instanceOf(TweetError);
      expect(error.message).to.include("not a tweet URL");
    }
    expect(called).to.equal(false);
  });

  const failing = [
    [404, /not found/i],
    [403, /protected or restricted/i],
    [429, /limiting requests/i],
    [500, /HTTP 500/],
  ];
  for (const [status, pattern] of failing) {
    it(`gives a clear message for HTTP ${status}`, async () => {
      try {
        await fetchTweet("https://x.com/jack/status/20", options(status, new Error("body must not be read")));
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).to.be.instanceOf(TweetError);
        expect(error.message).to.match(pattern);
      }
    });
  }

  it("gives a clear message when the network fails", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    try {
      await fetchTweet("https://x.com/jack/status/20", { fetchImpl, ParserClass: DOMParser });
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).to.be.instanceOf(TweetError);
      expect(error.message).to.match(/Could not reach X/);
    }
  });

  it("gives a clear message when the answer is not JSON", async () => {
    try {
      await fetchTweet("https://x.com/jack/status/20", options(200, new SyntaxError("Unexpected token <")));
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).to.be.instanceOf(TweetError);
      expect(error.message).to.match(/does not understand/);
    }
  });
});
