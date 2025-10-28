import { ethers } from "ethers";
import { Response, Request } from "express";
import { network } from "../contracts/providers";
import { UserController } from "../../user/controller";
import { FavoriteController } from "../controller/favorite";
import { NFTMarketDatasController } from "../controller/nft";
import { ActivitiesController, CollectionCacheController, NFTItemsController, NFTMetaDatasController, NFTOrderBookController, PaylableTokensController } from "../controller";
import Config from "../../../config.json";
import setlog from "../../utils/setlog";
import { Now, addToIpfs, getValidHttpUrl } from "../../utils";
import { ZeroAddress, estimateGasForNFTExport, getIdByHash} from "../../utils/blockchain";


const create = async (req: Request | any, res: Response) => {
	try {
		const { name, collection, description, website, property, isMetamask, isSale, saleType, price, acceptedToken, isDigital, isCopyright, isRight, startTime, endTime } = req.body;
		if(isMetamask !== '1') {
			if (!req.user?.address) return res.status(200).send({ message: "auth error" });
			let creatorInfo = await UserController.find({
				filter: {
					address: req.user.address
				}
			}) as any;
			if (creatorInfo.length === 0) {
				return res.status(200).send({ message: "no exists address" });
			}
		}		 
		const imageData = req.files?.image?.data;
		const imageHash = await addToIpfs(imageData);
		const hash = Config.IPFS_BASEURL + imageHash;
		const metadata = {
			name: name,
			collection: collection,
			description: description,
			external_url: website,
			image: hash,
			attributes: JSON.parse(property) || []
		}
		const metaHash = await addToIpfs(JSON.stringify(metadata)) as string;
		const tokenUrl = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
		const owner = req.user?.address;
		let id = getIdByHash(metaHash)
		id = ethers.BigNumber.from("0x" + id).toString()
		if(isMetamask === '1') {
			return res.status(200).send({message: "uploaded", id: id})
		}
		await NFTMetaDatasController.create({
			nftCollection: collection,
			id: id,
			metaHash: tokenUrl,
			name: metadata.name,
			description: metadata.description,
			image: metadata.image,
			coverImage: metadata.image,
			externalSite: metadata.external_url,
			attributes: metadata.attributes,
			views: 0,
			favs: 0,
			reacts: [],
			error: "",
			network: network
		});
		await NFTItemsController.create({
			id: id,
			nftCollection: collection,
			owner: owner,
			creator: owner,
			pick: false,
			onChain: false,
			hide: false
		});
		await NFTMarketDatasController.create({
			nftCollection: collection,
			id: id,
			acceptedToken: isSale === '1' ? acceptedToken : "ETH",
			price: isSale === '1' ? price : 0,
			saleType: isSale === '1' ? saleType :  "",
			owner: owner,
			expiredTime: Number(endTime),
			isDigital: isDigital === '1' ? true: false, 
			isCopyright: isCopyright === '1' ? true: false, 
			isRight: isRight === '1' ? true: false, 
			updatedBlockNum: 0,
			multiple: false
		});
		await NFTOrderBookController.create({
			nftCollection: collection,
			id: id,
			type:  isSale === '1' ? saleType :  "",
			acceptedToken: isSale === '1' ? acceptedToken : "ETH",
			price:isSale === '1' ? price : 0,
			owner: owner,
			bidders: [],
			startTime: Number(startTime),
			endTime: Number(endTime),
			created: Now(),
			updatedBlockNum: 0,
		})
		await ActivitiesController.create({
			nftCollection: collection,
			tokenid: id,
			type: "Created",
			params: [
				{
					type: "from",
					value: ZeroAddress
				},
				{
					type: "to",
					value: owner
				},
				{
					type: "created",
					value: Now()
				}
			]
		});
		let collectionInfo= await CollectionCacheController.findOne({address: collection.toUpperCase()}) as any;
		const items = Number(collectionInfo?.items || 0) + 1;
		await CollectionCacheController.update({
			address: collection.toUpperCase()
		}, {
			items: items
		})
		if(isSale) {
			await ActivitiesController.create({
				nftCollection: collection?.toUpperCase(),
				tokenid: id,
				type: "Listed",
				params: [
					{
						type: "acceptedToken",
						value: acceptedToken
					},
					{
						type: "price",
						value: price
					},
					{
						type: "from",
						value: owner
					},
					{
						type: "to",
						value: ""
					},
					{
						type: "created",
						value: Now()
					}
				]
			});
			const floor = collectionInfo?.floor || 0;
			if(saleType === "regular"){
				if(floor === 0 || price < floor) {
					await CollectionCacheController.update({
						address: collection.toUpperCase()
					}, {
						floor: price
					})
				}
			}
		}
		return res.status(200).send({ message: "success", tokenId: id});
	} catch (err) {
		setlog("nft create", err);
		console.log(err)
		res.status(200).send({ message: "internal error" });
	}
}


const favorite = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, mail} = req.body;  
		const user = req.user?.address;
		if(!user) {
			return res.status(200).send({ message: "auth error" });
		}
		const exists = await FavoriteController.find(
			{
				collectionid: collectionid,
				nftid: nftid,
				userAddress: user
			}
		)
		const nftInfo = await NFTMetaDatasController.findOne({
			nftCollection: collectionid,
			id: nftid
		});
		let favs = nftInfo?.favs || 0;
		if(exists?.length > 0) {
			await FavoriteController.delete({
				collectionid: collectionid,
				nftid: nftid,
				userEmail: mail, 
				userAddress: user
			})
			if(favs === 0) favs = 1;
			await NFTMetaDatasController.update({
				nftCollection: collectionid,
				id: nftid
			}, 
			{favs: favs - 1})
			return res.status(200).send({ message: "success" });
		} else {
			await FavoriteController.create({
				collectionid: collectionid,
				nftid: nftid,
				userEmail: mail, 
				userAddress: user
			})
			await NFTMetaDatasController.update({
				nftCollection: collectionid,
				id: nftid
			}, 
			{favs: favs + 1})
			return res.status(200).send({ message: "success" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const setView = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid} = req.body;  
		const metadata = await NFTMetaDatasController.findOne({
			nftCollection: collectionid,
			id: nftid
		})
		const views = metadata?.views || 0;
		if(collectionid?.length === 42 && nftid) {
			await NFTMetaDatasController.update({
				nftCollection: collectionid,
				id: nftid
			}, {
				views: views + 1
			})
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const getExportFee = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid} = req.body;  
		const { gasPrice, gasLimit, gasFee} = await estimateGasForNFTExport(collectionid, nftid);
		
		const ethToken = await PaylableTokensController.find({
			symbol: "ETH"
		});
		const ethPrice = ethToken?.[0]?.usd || 2000;
		const usdPrice = Number(gasFee) * Number(ethPrice);

		return res.status(200).send({ message: "success", eth: gasFee, usd: usdPrice });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

export default {
	create,
	favorite,
	setView,
	getExportFee
}