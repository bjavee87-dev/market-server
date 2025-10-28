import axios from "axios";
import colors from "colors";
import { Network } from "alchemy-sdk";

import config from "../../../config.json";
import { network } from "../contracts/providers";
import { Now, fromBigNum, getValidHttpUrl, toBigNum } from "../../utils";
import { NFTMarketDatasController } from "../controller/nft";
import { getNFTContract, getNFTContract_m, marketplaceContract, multicallHelper } from "../contracts";
import { NFTItemsController, NFTOrderBookController, NFTMetaDatasController, CollectionCacheController } from "../controller";

const alchemyUrl = `https://${Network.ETH_MAINNET}.g.alchemy.com/nft/v2/${config.AlchemyApiKey}/getNFTsForCollection`

const errorConsole = (title: string, message?: string | '') => {
	console.log(colors.red(title + ' :: '), message)
}

const saveCollectionNfts = async (address: string, tokenIds: string[], owners: string[], tokenUris: string[], ignoreList: string[]) => {
	try {
		// market datas
		var tokenIdsOnMarket = [];
		const marketAddress = marketplaceContract.address;

		// get token uri
		for (let index = 0; index < tokenIds.length; index++) {
			if (ignoreList?.indexOf(tokenIds[index]) > -1) continue;

			try {
				let metadata: any = {}, error = "";
				let tokenUri = getValidHttpUrl(tokenUris[index]);
				console.log("tokenUri", tokenUri);

				tokenUri = tokenUri.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
				metadata = (await axios.get(tokenUri)).data;

				await NFTItemsController.create({
					id: tokenIds[index],
					nftCollection: address,
					creator: owners[index],
					owner: owners[index],
					pick: false,
					onChain: false,
					hide: false
				})

				await NFTMarketDatasController.create({
					nftCollection: address,
					id: tokenIds[index],
					acceptedToken: "ETH",
					price: 0,
					saleType: "",
					owner: owners[index],
					expiredTime: 0,
					updatedBlockNum: 0,
					multiple: false
				})

				await NFTOrderBookController.create({
					nftCollection: address,
					id: tokenIds[index],
					acceptedToken: "ETH",
					price: 0,
					type: "",
					owner: owners[index],
					startTime: 0,
					endTime: 0,
					created: Now(),
					bidders: [],
					updatedBlockNum: 0
				})

				try {
					const _image = getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com");

					await NFTMetaDatasController.create({
						nftCollection: address,
						id: tokenIds[index],
						metaHash: metadata.metaHash,
						name: metadata.name,
						description: metadata.description,
						image: _image,
						coverImage: _image,
						externalSite: metadata.externalSite,
						attributes: metadata.attributes,
						views: 0,
						favs: 0,
						reacts: [],
						error: "",
						network: network
					})

					let items = await CollectionCacheController.findOne({ address: address.toUpperCase() }) as any;
					await CollectionCacheController.update({ address: address.toUpperCase() }, { items: (items?.items || 0) + 1 })
				} catch (err) {
					console.log('blockchainapis/handlesync/syncNFTItems/metadata error :', err.message);
				}

				//NFT in market
				if ((owners[index]).toUpperCase() === marketAddress.toUpperCase()) {
					tokenIdsOnMarket.push(tokenIds[index]);
				}
			} catch (err: any) {
				console.log("metadataError :: ", err.message);
			}
		}

		return true;
	} catch (err) {
		errorConsole('syncNfts_DB_store', err.message);
		return false;
	}
}

const useBaseImport = async (address: string, ignoreList?: string[]) => {
	try {
		// manageNFTs.createNFT
		let multiCalls = [], tokenIds: any[];
		const NFTContract = getNFTContract(address);
		const totalSupply = await NFTContract.totalSupply();
		const NFTContract_m = getNFTContract_m(address);
		console.log("NFT sync", address, Number(totalSupply));

		// get all token Ids
		for (let i = 0; i < Number(totalSupply); i++) {
			multiCalls.push(NFTContract_m.tokenByIndex(String(i)));
		}

		try {
			tokenIds = await multicallHelper(multiCalls);
			tokenIds = tokenIds.map(tokenId => String(tokenId))

			console.log("NFT sync", "tokenIds", tokenIds.length)
		} catch (err) {
			// console.log("tokenIds", err.message)
			tokenIds = [...Array(Number(totalSupply)).keys()]
		}

		// get token uris
		multiCalls = tokenIds.map((tokenId) => { return NFTContract_m.tokenURI(tokenId) })
		const tokenUris = await multicallHelper(multiCalls);
		console.log("NFT sync", "tokenUris", tokenUris.length)

		// get token owners
		multiCalls = tokenIds.map((tokenId) => { return NFTContract_m.ownerOf(tokenId) })
		const owners = await multicallHelper(multiCalls);
		console.log("NFT sync", "owners", owners.length)

		let saveResult = await saveCollectionNfts(address, tokenIds, owners, tokenUris, ignoreList)
		console.log('collection_import :: ', saveResult)

		return true
	} catch (err) {
		errorConsole('syncNFTItems :', err.message);
		return false
	}
}

const useAlchemy = async (address: string, startToken: string = '', ignoreList?: string[]) => {
	try {
		const NFTContract = getNFTContract(address);
		const totalSupply = await NFTContract.totalSupply();
		console.log("NFT sync", address, parseInt(startToken || '0x00', 16), Number(totalSupply));

		const options = {
			method: 'GET', url: alchemyUrl,
			params: {
				contractAddress: address,
				withMetadata: true,
				startToken: startToken,
			},
			headers: { accept: 'application/json' }
		}

		let getResult: any = await axios.request(options)
		let nftsInfo = getResult?.data

		if (typeof nftsInfo?.nfts?.length === 'number') {
			const nextToken = nftsInfo?.nextToken
			const tempNfts = nftsInfo.nfts
			let tokenUris = []
			let tokenIds = []
			let owners = []

			console.log(tempNfts.length)
			for (let i = 0; i < tempNfts.length; i++) {
				try {
					const tempNft = tempNfts[i];
					const tokenUri = tempNft.tokenUri.raw
					const tokenId = String(fromBigNum(tempNft.id.tokenId, 0))
					const owner = await NFTContract.ownerOf(tokenId)

					owners.push(owner)
					tokenIds.push(tokenId)
					tokenUris.push(tokenUri)
				} catch (err) {
					console.log(err.message)
				}
			}

			let saveResult = await saveCollectionNfts(address, tokenIds, owners, tokenUris, ignoreList)
			console.log('collection_import :: ', saveResult)

			if (nextToken) {
				await useAlchemy(address, nextToken, ignoreList)
			}

			return true
		} else {
			throw new Error("nftSync_error");
		}
	} catch (err) {
		errorConsole('collection_importError :: ', err.message)
		return false
	}
}

export const NFTSync = async (address: string, ignoreList?: string[]) => {
	// await useBaseImport(address, ignoreList)
	await useAlchemy(address, '', ignoreList)
}