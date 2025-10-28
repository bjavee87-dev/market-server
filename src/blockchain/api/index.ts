import NftApi from './nft';
import CollectionAPI from './collection';
import { NFTSync } from "../handlers/sync";
import { supportChainId } from "../contracts/providers";
import { marketEventHandler, nftEventHandler } from "../handlers";
import { CollectionsController, GasController, PaylableTokensController, CategoryController } from "../controller";
import { Now } from "../../utils";
import { nftContractGasEstimate, toChecksumAddress } from "../../utils/blockchain";
import MockCategory from '../mock/Category.json';
import MockPaylableTokens from '../mock/PaylableTokens.json';

const blockchainAPI = {
	initData: async () => {
		//paylableToken
		let promises = MockPaylableTokens.map(async (mockData: any) => {
			const newTokenData: PaylableToken = {
				address: toChecksumAddress(mockData.address),
				icon: mockData.icon,
				name: mockData.name,
				symbol: mockData.symbol,
				coingeckoid: mockData.coingeckoid,
				decimals: mockData.decimals,
				isNative: true,
				internalLimit: mockData.internalLimit
			}
			try {
				await PaylableTokensController.create(newTokenData);
				console.log("create paylable token",  newTokenData.address);
			} catch (err) {
				console.log("create nftCollection error", " ", err.message);
			}
		})
		await Promise.all(promises);

		//gas
		const {gasPrice, gasLimit} = await nftContractGasEstimate({ privateKey: "admin", name: "Test" });
		const gasData: GasInterface = {
			chainId: supportChainId,
			gasPrice: gasPrice,
			collectionGas: gasLimit,
			lasttime: Now()
		}
		try {
			await GasController.create(gasData);
		} catch (err) {
			console.log("create nftCollection error", " ", err.message);
		}
		await Promise.all(promises);

		//category
		promises = Object.entries(MockCategory).map(async ([key, category]) => {
			const newCategory: Category = {
				key: key,
				jp: category.jp,
				en: category.en
			}
			try {
				let res = await CategoryController.create(newCategory);
				console.log("create category",  category);
			} catch (err) {
				console.log("create category error", " ", err.message);
			}
		})
		await Promise.all(promises);
	},
	initEventHandlers: async () => {
		console.log("handle Start");
		const collections = await CollectionsController.find({});
		collections.map((value:any) => {
			nftEventHandler(value.address);	
		})
		marketEventHandler()
	},
	initSync: async () => {
		console.log("Sync Start");
		const collections = await CollectionsController.find({});
		const promises = collections.map(async(value:any) => {
			await NFTSync(value.address);
		})
		await Promise.all(promises);
	}
}

export { CollectionAPI, NftApi, blockchainAPI }