import { ethers } from 'ethers';
import Config from "../../../config.json";

const supportChainId = Number(Config.CHAINID || 11155111);

export const RPCS = {
    1: "https://eth-mainnet.g.alchemy.com/v2/fhCdKI9G1b1r60Iwo-Pf3DQDtVf_JCsN",
    5: "https://rpc.ankr.com/eth_goerli",
    97: "https://bsc-testnet.public.blastapi.io",
    250: "https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac",
    4002: "https://fantom-testnet.public.blastapi.io",
    421613: "https://goerli-rollup.arbitrum.io/rpc",
    11155111: "https://rpc.sepolia.org"
    // 4: 'http://85.206.160.196',
    // 1337: "http://localhost:7545",
    // 31337: "http://localhost:8545/",
};

const providers: any = {
    1: new ethers.providers.JsonRpcProvider(RPCS[1]),
    // 4: new ethers.providers.JsonRpcProvider(RPCS[4]),
    // 5: new ethers.providers.JsonRpcProvider(RPCS[5]),
    // 250: new ethers.providers.JsonRpcProvider(RPCS[250]),
    // 97: new ethers.providers.JsonRpcProvider(RPCS[97]),
    // 4002: new ethers.providers.JsonRpcProvider(RPCS[4002]),
    421613: new ethers.providers.JsonRpcProvider(RPCS[421613]),
    11155111:new ethers.providers.JsonRpcProvider(RPCS[11155111]),
    // 1337: new ethers.providers.JsonRpcProvider(RPCS[1337]),
    // 31337: new ethers.providers.JsonRpcProvider(RPCS[31337]),
};

const networkNames = {
    1: "Ethereum",
    5: "Ethereum Goerli",
    97: "Binance Testnet",
    250: "Fantom",
    4002: "Fantom Testnet",
    421613: "Arbitrum Goerli",
    42161: 'Arbitrum',
    11155111: 'Sepolia Testnet'
}

const network = networkNames[supportChainId]

const provider = providers[supportChainId];


export { supportChainId, provider, network };