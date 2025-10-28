import bs58 from 'bs58'
import axios from "axios";
import keccak from 'keccak'
import colors from "colors";
import cron from "node-cron";
import { ethers } from "ethers";
import { callRpc, getValidHttpUrl } from "./index";
import { badd, bmul, formatUnit } from "./bigmath";
import AdminWalletController from '../admin/controller/wallet';
import { getERC20Contract, getMarketplaceContractWithSigner, getNFTContract, getNFTContractWithSigner, getNFTsigner, getRouterContract } from "../blockchain/contracts";
import { RPCS, provider, supportChainId } from "../blockchain/contracts/providers";
import Abis from "../blockchain/contracts/abi/abis.json";
import Addresses from "../blockchain/contracts/abi/addresses.json";
import Bytecode from '../blockchain/contracts/abi/bytecode.json'
import setlog from "./setlog";

// Every Block Handle
export const handleEvent = async (props: any) => {
	const {
		id,
		provider,
		contract,
		event,
		times,
		handler,
		BlockNumController,
	} = props;

	var latestblocknumber: any;
	const handletransactions = async () => {
		try {
			let blockNumber = await provider?.getBlockNumber();
			// console.log("handle transactions: ", contract.address, event, latestblocknumber, blockNumber)

			if (blockNumber > latestblocknumber) {
				blockNumber =
					blockNumber > latestblocknumber + 100
						? latestblocknumber + 100
						: blockNumber;
				var txhistory;
				if (id !== ZeroAddress) {
					//token
					txhistory = contract.queryFilter(
						event,
						latestblocknumber + 1,
						blockNumber
					);
					await txhistory?.then(async (res: any) => {
						for (var index in res) {
							handler(res[index], id);
						}
					});
				}
				else {
					//native ETH
					const json = [];
					for (let k = latestblocknumber + 1; k <= blockNumber; k++) {
						json.push({ jsonrpc: "2.0", method: "eth_getBlockByNumber", params: ['0x' + k.toString(16), true], id: k })
					}
					const results = await callRpc(RPCS[supportChainId], json)
					let blockCount = 0
					if (results && Array.isArray(results)) {
						blockCount = results.length
						for (let i of results) {
							if (i && i.result) {
								const raw = i.result
								let txn = raw.transactions.length as number
								if (txn) {
									for (let tx of raw.transactions) {
										handler(tx, id);
									}
								}
							}
						}
					}
				}
				latestblocknumber = blockNumber;
				await BlockNumController.update(
					{ id: id },
					{ latestBlock: blockNumber }
				);
			}
		} catch (err) {
			if (err.reason === "missing response") {
				console.log(colors.red("you seem offline"));
			}
			else if (err.reason === "could not detect network") {
				console.log(colors.red("could not detect network"));
			}
			else {
				console.log("handletransactions err", err.reason);
			}
		}
	};

	const handleEvent = async () => {
		try {
			try {
				var blockNumber = (await BlockNumController.find({ id: id })).latestBlock;
				if (!blockNumber) throw new Error("not find");
			} catch (err) {
				blockNumber = await provider?.getBlockNumber();
				await BlockNumController.create({
					id: id,
					latestBlock: blockNumber,
				});
			}
			latestblocknumber = blockNumber;
			cron.schedule(`*/${times} * * * * *`, () => {
				// console.log(`running a transaction ${id} handle every ${times} second`);
				handletransactions();
			});
		} catch (err: any) {
			console.log(`running a transaction ${id} handle error ${err.message}`);
		}
	};
	handleEvent();
};

export const sign = async (types, values, signer) => {
	let messageHash = ethers.utils.solidityKeccak256(types, values);
	let signature = await signer.signMessage(
		ethers.utils.arrayify(messageHash)
	);
	return signature;
};

export const paymentSign = async (data: any) => {
	const { type, orderId, paymentTokenAddress, amount, deadline, signer } = data;
	let messageHash = ethers.utils.solidityKeccak256(
		["string", "bytes32", "address", "uint", "uint"],
		[type, orderId, paymentTokenAddress, amount, deadline]
	);
	let signature = await signer.signMessage(
		ethers.utils.arrayify(messageHash)
	);
	return signature;
};

export const decodeByte32String = (text: string) => {
	return ethers.utils.parseBytes32String(text)
}

export const encodeByte32String = (text: string) => {
	try {
		return ethers.utils.formatBytes32String(text)
	} catch (err) {
		return null;
	}
}

function stripHexPrefix(value: string) {
	return value.slice(0, 2) === '0x' || value.slice(0, 2) === '0X' ? value.slice(2) : value
}
export const toChecksumAddress = (address: string) => {
	try {
		if (typeof address !== 'string') return '';
		if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) return '';
		const stripAddress = stripHexPrefix(address).toLowerCase();
		const keccakHash = keccak('keccak256').update(stripAddress).digest('hex');
		let checksumAddress = '0x';
		for (let i = 0; i < stripAddress.length; i++) {
			checksumAddress += parseInt(keccakHash[i], 16) >= 8 ? stripAddress[i]?.toUpperCase() : stripAddress[i];
		}
		return checksumAddress;
	} catch (err) {
		console.log(err);
		setlog("tochecksumaddress", err);
		return address;
	}
}

export const generateAddress = () => {
	const wallet = ethers.Wallet.createRandom()
	return { privatekey: wallet.privateKey, publickey: wallet.address };
}

export const getAddressFromPrivateKey = (privateKey: string) => {
	const w = new ethers.Wallet(privateKey);
	return w.address;
}

export const transferToken = async (from_privateKey: string, to: string, tokenAddress: string, amount: number, decimals: number = 18) => {
	try {
		let wallet = new ethers.Wallet(from_privateKey, provider);
		const price = await gasPrice();
		console.log(tokenAddress, amount, ethers.utils.parseEther(amount.toString()))
		if (tokenAddress === ZeroAddress) {
			let tx = {
				to: to,
				value: ethers.utils.parseEther(amount.toString()),
				// gasPrice: ethers.utils.parseUnits(price, "gwei")
			};
			const txObj = await wallet.sendTransaction(tx);
			await txObj.wait()
			return txObj.hash;
		} else {
			const erc20 = getERC20Contract(tokenAddress, wallet);
			let txObj = await erc20.transfer(to, ethers.utils.parseUnits(amount.toString(), decimals), {
				gasPrice: ethers.utils.parseUnits(price, "gwei")
			});
			await txObj.wait()
			return txObj.hash;
		}
	} catch (err) {
		setlog("send transaction error", err.message)
		throw new Error("transferToken Error:" + err.message)
	}
}

// export const swapTokensForExactETH = async (from_privateKey: string, fromToken: string, toToken: string, outAmount: number, to: string): Promise<string | null | boolean> => {
// 	try {
// 		if (Number(outAmount) === 0) return true;
// 		if (fromToken.toUpperCase() === toToken.toUpperCase()) return true;
// 		let signer = new ethers.Wallet(from_privateKey, provider)
// 		const ca = getRouterContract(signer);
// 		const out = outAmount;
// 		let estimateToken = await ca.getAmountsIn(out, [fromToken, toToken]);
// 		console.log(estimateToken)
// 		estimateToken = estimateToken[0];
// 		const maxIn = bmul(estimateToken, 2);

// 		// const price = await gasPrice();
// 		const tokenCa = getERC20Contract(fromToken, signer);
// 		const approveTx = await tokenCa.approve(Addresses.router, maxIn);
// 		await approveTx.wait();
// 		let tx = await ca.swapTokensForExactETH(out, maxIn, [fromToken, toToken], to, 1111111111111, {
// 			// gasPrice: ethers.utils.parseUnits(price, "gwei")
// 		})
// 		await tx.wait();
// 		return tx;
// 	} catch (err) {
// 		setlog("estimate gas error", err.message)
// 		return null
// 	}
// }

export const estimateGasForTransfer = async (from_privateKey: string, to: string, tokenAddress: string, amount: number) => {
	let signer = new ethers.Wallet(from_privateKey, provider)
	const price = await gasPrice()
	if (tokenAddress === ZeroAddress) {
		const gasLimit = await provider?.estimateGas({
			to: to,
			value: ethers.utils.parseEther(amount.toString())
		});
		const gasFee = Number(price) * Number(formatUnit(gasLimit, 9));
		return {
			gasPrice: price,
			gasFee: gasFee.toFixed(6),
			gasLimit: gasLimit
		};
	}
	else {
		const erc20 = getERC20Contract(tokenAddress, signer);
		let gasLimit = await erc20.estimateGas.transfer(to, ethers.utils.parseUnits(amount.toString()));
		const gasFee = Number(price) * Number(formatUnit(gasLimit, 9));
		return {
			gasPrice: price,
			gasFee: gasFee.toFixed(6),
			gasLimit: gasLimit
		};
	}
}

export const estimateGasForNFTExport = async (collection: string, token: string) => {
	const nftAdminKey = (await AdminWalletController.findOne({ type: "nft" }))?.privatekey || null;
	const tokenId = token.length === 64 ? "0x" + token : token;
	let isMinted: boolean = false;
	const ca = getNFTContractWithSigner(collection, nftAdminKey);
	let nftowner = null;
	try {
		nftowner = await ca.ownerOf(tokenId);
		if (nftowner) isMinted = true;
	} catch (err) {
		console.log(err.message)
		isMinted = false;
	}

	const price = await gasPrice()

	if (isMinted) {
		if (nftowner === Addresses.market) {  // in market contract
			const signer = await getNFTsigner()
			const marketCa = getMarketplaceContractWithSigner(signer);
			let gasLimit = await marketCa.estimateGas.exportNFT(toChecksumAddress(collection), token, toChecksumAddress("0xE71E33e78C5d4764549123Ec4B770eF66FbD2398"));
			const gasFee = Number(price) * Number(formatUnit(gasLimit, 9)) * 1.3;
			return {
				gasPrice: price,
				gasLimit: gasLimit,
				gasFee: gasFee.toFixed(6)
			};
		}
	}
	else {
		let gasLimit = await ca.estimateGas.mint(tokenId);
		const gasFee = Number(price) * Number(formatUnit(gasLimit, 9)) * 1.9;
		return {
			gasPrice: price,
			gasLimit: gasLimit,
			gasFee: gasFee.toFixed(6)
		};
	}
}

export const getTransaction = async (hash: string) => {
	return await provider?.getTransaction(hash);
}

export const getL1BlockNumber = async () => {
	try {
		return await provider?.getBlockNumber();
	} catch (err) {
		console.log("getBlocknumber error: ", err.message)
		return 0;
	}
}

export const checkTransactions = (rpc: string, txIds: string[]): Promise<any[]> => {
	return new Promise(async resolve => {
		let params = []
		txIds?.forEach((element, index) => {
			params.push({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [element], id: index + 1 })
		});
		const response = await axios.post(rpc, params, { headers: { 'Content-Type': 'application/json' } })
		if (response && response?.data) return resolve(response?.data)
	})
}

export const gasPrice = async () => {
	const price_unit = "gwei";
	const feedata = await provider?.getFeeData();
	let price = ethers.utils.formatUnits(feedata?.maxFeePerGas, price_unit);
	if (!price) {
		price = ethers.utils.formatUnits(await provider?.getGasPrice(), price_unit);
	}

	return price;
}

export const getEthBalance = async (address: string) => {
	const balance = await provider?.getBalance(toChecksumAddress(address));
	return balance;
}

export const nftContractDeploy = async (props: { privateKey: string, name: string }) => {
	let { privateKey, name } = props;
	if (privateKey === "admin") {
		const nftAdminKey = (await AdminWalletController.findOne({ type: "nft" }))?.privatekey || null;
		privateKey = nftAdminKey;
	}
	let wallet = new ethers.Wallet(privateKey, provider);
	let factory = new ethers.ContractFactory(Abis.NFT, Bytecode.NFT, wallet);
	const price = await gasPrice()
	let contract = await factory.deploy(name, name + " NFT",
		{
			gasPrice: ethers.utils.parseUnits(price, "gwei"),
		}
	);
	await contract.deployed();
	return contract;
};


export const nftContractGasEstimate = async (props: { privateKey: string, name: string }) => {
	try {
		let { privateKey, name } = props;
		if (privateKey === "admin") {
			const nftAdminKey = (await AdminWalletController.findOne({ type: "nft" }))?.privatekey || null;
			privateKey = nftAdminKey;
		}
		let wallet = new ethers.Wallet(privateKey, provider);
		let factory = new ethers.ContractFactory(Abis.NFT, Bytecode.NFT, wallet);
		const price = await gasPrice()
		const tx = factory.getDeployTransaction(name, name + ' NFT')
		let estimatedGas = await provider?.estimateGas(tx);
		const gasFee = Number(price) * Number(formatUnit(estimatedGas, 9));
		return {
			gasPrice: price,
			gasFee: gasFee.toFixed(6),
			gasLimit: estimatedGas
		};
	} catch (err) {
		if (err.reason === "missing response") {
			console.log(colors.red("you seem offline"));
		}
		else if (err.reason === "could not detect network") {
			console.log(colors.red("could not detect network"));
		}
		else {
			setlog("nftContractGasEstimate", err.message);
		}
		return {
			gasPrice: "0",
			gasFee: "0",
			gasLimit: "0"
		};
	}
};

export const ZeroAddress = "0x0000000000000000000000000000000000000000";

export const getIdByHash = (text: string) => {
	try {
		const bytes = bs58.decode(text)
		const hex = Buffer.from(bytes).toString('hex')
		const tokenId = hex.slice(4)
		return tokenId
	} catch (err) {
		setlog("getIdByHash", err);
		return null
	}
}

export const recoverPersonalData = (data: any, hash: string) => {
	try {
		const k = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("\x19Ethereum Signed Message:\n" + data.length + data));
		const recoveredAddress = ethers.utils.recoverAddress(k, hash)
		return recoveredAddress
	}
	catch (err) {
		setlog("recoverPersonalData", err);
		return null
	}
}
0
export const getImgFromTokenId = async (collectionid, nftid) => {
	const contract = getNFTContract(collectionid.toUpperCase());
	const metaHash = await contract.tokenURI(nftid);
	let tokenUri = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
	var error: any = null, metadata: any = {};
	try {
		metadata = await axios.get(tokenUri);
	} catch (err) {
		error = err.message;
		console.log(err.message)
		return null;
	}
	metadata = metadata.data || {};
	return metadata?.image;
}