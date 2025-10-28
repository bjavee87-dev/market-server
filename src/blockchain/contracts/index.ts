import { Signer, ethers } from 'ethers';
import { Contract, Provider, setMulticallAddress } from 'ethers-multicall';
import { provider, supportChainId } from './providers';
import AdminWalletController from '../../admin/controller/wallet';
import Abis from "./abi/abis.json";
import Addresses from "./abi/addresses.json";
import RouterAbis from "./abi/router-abis.json";
import setlog from '../../utils/setlog';
import { gasPrice, toChecksumAddress } from '../../utils/blockchain';


/* ----------- multicall helpers ----------- */
setMulticallAddress(250, "0xaeF5373b058DceacedF2995005A86aDfE860c4B4");
setMulticallAddress(4002, "0x2baadf55fb2177e8d13708a7f09b966f671555eb");
setMulticallAddress(421613, "0x6B3a27944A73cB7a8a12aA6C45d196732e1E3543");
setMulticallAddress(11155111, "0x558A7Ff553A446E2612bB1E7bFe34eB24C842843");


const multicallProvider = new Provider(provider, supportChainId);

const multicallHelper = async (calls: any[]) => {
	let results: any[] = [];
	for (let i = 0; i < calls?.length; i += 100) {
		const sCalls = calls.slice(i, i + 100);
		const res = await multicallProvider?.all(sCalls);
		results = [...results, ...res];
	}
	return results;
};


const getTokenContract = (address: string) => {
	try {
		if (!address) return null;
		return new ethers.Contract(toChecksumAddress(address), Abis.TestToken);
	} catch (err) {
		setlog("getERC20contract", err.message)
		return null
	}
}

const getERC20Contract = (address: string, signer?: Signer) => {
	return new ethers.Contract(toChecksumAddress(address), Abis.TestToken, signer || provider);
}


const getERC20Contract_m = (address: string) => {
	return new Contract(toChecksumAddress(address), Abis.TestToken);
};


const getRouterContract = (signer?: Signer) => {
	try {
		return new ethers.Contract(toChecksumAddress(Addresses.router), RouterAbis, signer || provider);
	} catch (err) {
		setlog("getRouterContract", err.message)
		return null
	}
}
/* ----------- nft contract ----------- */
const getNFTContract = (address: string) => {
	try {
		if (!address) return null;
		return new ethers.Contract(toChecksumAddress(address), Abis.NFT, provider);
	} catch (err) {
		setlog("getNFTcontract", err.message)
		return null
	}
};
const getNFTContractWithSigner = (address: string, privatekey: string) => {
	try {
		if (!address) return null;
		const signer = new ethers.Wallet(privatekey, provider);
		return new ethers.Contract(toChecksumAddress(address), Abis.NFT, signer);
	} catch (err) {
		setlog("getNFTContractWithSigner", err.message)
		return null
	}
};
const getNFTContract_m = (address: string) => {
	try {
		if (!address) return null;
		return new Contract(toChecksumAddress(address), Abis.NFT);
	} catch (err) {
		setlog("getNFTContractWithSigner", err.message)
		return null
	}
};

const getMarketplaceContractWithSigner = (signer: any) => {
	try {
		if (!signer) return null;
		return new ethers.Contract(Addresses.market, Abis.Marketplace, signer);
	} catch (err) {
		setlog("getMarketplaceContractWithSigner", err.message)
		return null
	}
}


/* ----------- marketplace contract ----------- */
const marketplaceContract = new ethers.Contract(
	(Addresses.market),
	Abis.Marketplace,
	provider
);


const getNFTsigner = async () => {
	try {
		const nftAdminKey = (await AdminWalletController.findOne({ type: "nft" }))?.privatekey || null;
		let signer = new ethers.Wallet(nftAdminKey, provider)
		return signer;
	} catch (err) {
		console.log("Error getNFTSigner", err.message)
		return null;
	}
}

const getTreasurysigner = async () => {
	try {
		const treasuryAdminKey = (await AdminWalletController.findOne({ type: "treasury" }))?.privatekey || null;
		let signer = new ethers.Wallet(treasuryAdminKey, provider)
		return signer;
	} catch (err) {
		console.log("Error getTreasurysigner", err.message)
		return null;
	}
}

export {
	multicallHelper,
	getTokenContract,
	getERC20Contract,
	getERC20Contract_m,
	getNFTContractWithSigner,
	getNFTContract,
	getRouterContract,
	getMarketplaceContractWithSigner,
	getNFTContract_m,
	marketplaceContract,
	gasPrice,
	getNFTsigner,
	getTreasurysigner,
	provider
}