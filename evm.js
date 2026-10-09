// A small EVM that runs inside the visitor's browser.
//
// Tevm (https://tevm.sh) provides the EVM and an EIP-1193 provider, web3.js talks to it
// exactly as it would talk to MetaMask. Nothing is sent to a network: the chain only
// exists in this page. The Tevm packages are pinned to exact versions and loaded from
// jsDelivr as ES modules. (npm resolves the newest @tevm/actions, which needs a newer
// @tevm/errors than any published one, so a plain "tevm" install is broken today. These
// packages and the dependencies jsDelivr resolves for them work together.)
import { createTevmNode } from "https://cdn.jsdelivr.net/npm/@tevm/node@1.0.0-rc.153/+esm";
import { requestEip1193 } from "https://cdn.jsdelivr.net/npm/@tevm/decorators@1.0.0-rc.151/+esm";
import { createSyncStoragePersister } from "https://cdn.jsdelivr.net/npm/@tevm/sync-storage-persister@1.0.0-rc.151/+esm";
import { abi, bytecode, deployedBytecode } from "./contract-data.js";

const STATE_KEY = "tweet-verifier:evm-state";
const ADDRESS_KEY = "tweet-verifier:contract-address";

// localStorage can be missing or blocked (private windows, blocked site data).
const getStorage = () => {
    try {
        const storage = window.localStorage;
        storage.setItem("tweet-verifier:probe", "1");
        storage.removeItem("tweet-verifier:probe");
        return storage;
    } catch (error) {
        return undefined;
    }
};

/**
 * Start the local EVM and make sure the contract is deployed on it.
 * Resolves with { web3, contract, account, persisted }.
 * `persisted` is true when the chain state is saved in localStorage, so records
 * survive a reload in this browser.
 */
export async function startLocalEvm() {
    const storage = getStorage();
    const persister = storage
        ? createSyncStoragePersister({ storage, key: STATE_KEY, throttleTime: 50 })
        : undefined;

    const node = createTevmNode(persister ? { persister } : {}).extend(requestEip1193());
    await node.ready();

    const web3 = new Web3(node);
    // Tevm starts with funded test accounts; the first one sends all transactions.
    const [account] = await web3.eth.getAccounts();

    // Reuse the contract from an earlier visit if the restored state still has it.
    let address = storage && storage.getItem(ADDRESS_KEY);
    if (address) {
        const code = await web3.eth.getCode(address);
        if (code.toLowerCase() !== deployedBytecode.toLowerCase()) address = undefined;
    }

    let contract;
    if (address) {
        contract = new web3.eth.Contract(abi, address);
    } else {
        const factory = new web3.eth.Contract(abi);
        const deployment = factory.deploy({ data: bytecode });
        const gas = await deployment.estimateGas({ from: account });
        contract = await deployment.send({ from: account, gas });
        if (storage) {
            try {
                storage.setItem(ADDRESS_KEY, contract.options.address);
            } catch (error) {
                // Not saving the address only means a fresh contract on the next visit.
            }
        }
    }

    return { web3, contract, account, persisted: Boolean(persister) };
}
