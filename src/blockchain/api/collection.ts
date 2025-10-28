import { Response, Request } from "express";

import { NFTSync } from "../handlers/sync";
import { UserController } from "../../user/controller";
import { supportChainId } from "../contracts/providers";
import { getNFTContract } from "../contracts";
import { nftEventHandler } from "../handlers";
import { CollectionCacheController, CollectionsController, GasController, PaylableTokensController } from "../controller";
import { ZeroAddress, getTransaction, nftContractDeploy, nftContractGasEstimate, toChecksumAddress } from "../../utils/blockchain";
import Config from "../../../config.json";
import setlog from "../../utils/setlog";
import { Now, addToIpfs } from "../../utils";

const create = async (req: Request | any, res: Response) => {
	try {
		const { name, slugurl, description, categori, url, pick, fee, twitter, discord, instagram, creator, address, hash, isMetamask, cover_image, collection_image } = req.body;
		let caAddress = null;
		const existsCollection = await CollectionsController.find({
			url: slugurl
		})

		let handleCollectionImage = collection_image;
		let handleCoverImage = cover_image;

		if (existsCollection?.length > 0) {
			return res.status(200).send({ message: "exists same slugurl" });
		}
		if (isMetamask === "1" && address && hash) {
			caAddress = address;
			const ca = getNFTContract(address);
			const _name = await ca.name();
			if (_name.toUpperCase() !== name?.toUpperCase()) {
				return res.status(200).send({ message: "No contract creator" });
			}
			const tx = await getTransaction(hash)
			if (tx) {
				if (tx?.from?.toUpperCase() != req.user?.address?.toUpperCase()) {
					return res.status(200).send({ message: "No contract creator" });
				}
			} else {
				return res.status(200).send({ message: "No contract creator" });
			}
		}
		else if (isMetamask == "0") {
			let creatorInfo = await UserController.find({
				filter: {
					address: creator
				}
			}) as any;
			if (creatorInfo.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				creatorInfo = creatorInfo[0];

				const coverImageHash = await addToIpfs(req.files?.coverImage?.data);
				const coverImage = Config.IPFS_BASEURL + coverImageHash;
				const imageHash = await addToIpfs(req.files?.image?.data);
				const collectionImage = Config.IPFS_BASEURL + imageHash;
				handleCollectionImage = collectionImage;
				handleCoverImage = coverImage;

				const privateKey = "admin";
				const { gasPrice, gasFee } = await nftContractGasEstimate({ privateKey: privateKey, name: name });
				await GasController.create({
					gasPrice: gasPrice,
					collectionGas: gasFee,
					chainId: supportChainId,
					lasttime: Now()
				})
				const balances = creatorInfo?.balances;
				const ethBalance = balances?.find((b) => { return b.address === ZeroAddress })?.balance || 0;
				if (Number(ethBalance) < Number(gasFee)) {
					return res.status(200).send({ message: "out of gas" });
				}
				const contract = await nftContractDeploy({ privateKey: privateKey, name: name });
				caAddress = contract?.address;
				if (!contract) return res.status(200).send({ message: "deploy error" });
				//minus fee of creator
				let newBalance = [], flag = false;
				balances?.forEach(element => {
					if (element?.address != ZeroAddress) {
						newBalance.push(element)
					}
					else {
						newBalance.push({
							address: element?.address,
							name: element?.name,
							symbol: element?.symbol,
							decimals: element?.decimals,
							icon: element?.icon,
							balance: (Number(element?.balance) - Number(gasFee)).toString()
						})
						flag = true;
					}
				});
				if (!flag) {
					const tokenInfo = await PaylableTokensController.find({
						address: ZeroAddress
					});
					const token = tokenInfo[0];
					if (token) {
						newBalance.push({
							address: token?.address,
							name: token?.name,
							symbol: token?.symbol,
							decimals: token?.decimals,
							icon: token?.icon,
							balance: (0 - Number(gasFee)).toString()
						})
					}
				}
				await UserController.update({
					filter: { address: creator },
					update: { balances: newBalance }
				})
			}
		}

		const newCollectionData: Collection = {
			address: caAddress,
			owner: creator,
			isLazyMint: false,
			fee: Number(fee),
			pick: pick === '1' ? true : false,
			error: '',
			category: categori.split(","),
			url: slugurl,
			metadata: {
				name: name,
				description: description,
				image: handleCollectionImage,
				coverImage: handleCoverImage,
				links: [
					{
						name: "website",
						link: url,
					},
					{
						name: "twitter",
						link: twitter
					},
					{
						name: "discord",
						link: discord
					},
					{
						name: "instagram",
						link: instagram
					},
				]
			},
			created: Now(),
			items: 0,
			owners: 0,
			volume: 0,
			volumeJpy: 0,
			floor: 0,
			bestoffer: 0,
		};
		await CollectionsController.create(newCollectionData);
		await CollectionCacheController.create({
			address: caAddress,
			items: 0,
			owners: 0,
			volume: 0,
			volumeJpy: 0,
			floor: 0,
			bestoffer: 0,
		})
		nftEventHandler(caAddress);
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request create collection", err);
		res.status(200).send({ message: "internal error" });
	}
}


const uploadCollectionImage = async (req: Request | any, res: Response) => {
	try {
		const { slugurl } = req.body;
		const existsCollection = await CollectionsController.find({
			url: slugurl
		})

		if (existsCollection?.length > 0) {
			return res.status(200).send({ message: "exists same slugurl" });
		}

		const coverImageHash = await addToIpfs(req.files?.coverImage?.data);
		const coverImage = Config.IPFS_BASEURL + coverImageHash;
		const imageHash = await addToIpfs(req.files?.image?.data);
		const collectionImage = Config.IPFS_BASEURL + imageHash;
		return res.status(200).send({ message: "success", coverImage, collectionImage });
	} catch (err) {
		setlog("uploadCollectionImage", err);
		res.status(200).send({ message: "internal error" });
	}
}


const importCollection = async (req: Request | any, res: Response) => {
	try {
		let { address, name } = req.body;
		address = toChecksumAddress(address)

		let owner = '';
		const ca = getNFTContract(address);
		const _name = await ca.name();

		if (_name.toUpperCase() !== name?.toUpperCase()) {
			return res.status(200).send({ message: "No match name" });
		}

		try {
			owner = await ca.owner()
		} catch (err) {
			owner = req?.user?.address;
		}

		// if(req?.user?.address?.toUpperCase() !== owner.toUpperCase()) return res.status(200).send({ message: "not owner"});
		const existsCollection = await CollectionsController.find({ address: address.toUpperCase() })
		if (existsCollection?.length > 0) {
			return res.status(200).send({ message: "exists already" });
		}

		const newCollectionData: Collection = {
			address: address,
			owner: owner,
			isLazyMint: false,
			fee: 0.5,
			pick: false,
			error: '',
			category: [],
			url: '',
			metadata: {
				name: name,
				description: '',
				image: '',
				coverImage: '',
				links: []
			},
			created: Now(),
			items: 0,
			owners: 0,
			volume: 0,
			volumeJpy: 0,
			floor: 0,
			bestoffer: 0,
		};

		await CollectionsController.create(newCollectionData);
		await CollectionCacheController.create({
			address: address,
			items: 0,
			owners: 0,
			volume: 0,
			volumeJpy: 0,
			floor: 0,
			bestoffer: 0,
		})

		NFTSync(address).then((result) => {
			nftEventHandler(address);
		})

		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request import collection", err);
		res.status(200).send({ message: "internal error" });
	}
}

const setBadge = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, owner } = req.body;
		const collection = await CollectionsController.find({ address: collectionid, owner: owner });
		if (collection.length > 0) {
			await CollectionsController.update({
				address: collectionid, owner: owner
			}, {
				verified: {
					status: "pending",
					reason: ""
				}
			})
			res.status(200).send({ message: "success" });
		}
		else {
			res.status(200).send({ message: "not exists collection" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const update = async (req: Request | any, res: Response) => {
	try {
		let { address, name, slugurl, description, categori, url, pick, fee, twitter, discord, image, coverImage, instagram, creator } = req.body;
		const existsCollection = await CollectionsController.find({
			url: slugurl
		})
		if (existsCollection?.length > 0 && existsCollection?.[0]?.address.toUpperCase() !== address.toUpperCase()) {
			return res.status(200).send({ message: "exists same slugurl" });
		}

		let creatorInfo = await UserController.find({
			filter: { address: creator }
		}) as any;

		if (creatorInfo.length === 0 && Config.admin_wallet.toUpperCase() !== creator.toUpperCase()) {
			return res.status(200).send({ message: "No exists user." });
		} else {
			creatorInfo = creatorInfo[0];
			if (req.files?.coverImageBlob?.data) {
				const coverImageHash = await addToIpfs(req.files?.coverImageBlob?.data);
				coverImage = Config.IPFS_BASEURL + coverImageHash;
			}

			if (req.files?.imageBlob?.data) {
				const imageHash = await addToIpfs(req.files?.imageBlob?.data);
				image = Config.IPFS_BASEURL + imageHash;
			}

			var links = [];
			// check existing links
			{
				let linkvalus = {
					"website": url,
					"twitter": twitter,
					"discord": discord,
					"instagram": instagram
				};

				Object.keys(linkvalus).forEach((key) => {
					if (!!linkvalus[key]) links.push({
						name: key,
						link: linkvalus[key],
					});
				});
			}

			const updateCollectionData = {
				fee: Number(fee),
				category: categori.split(","),
				url: slugurl,
				pick: pick === '1' ? true : false,
				metadata: {
					name: name,
					description: description,
					image: image,
					coverImage: coverImage,
					links
				}
			};

			await CollectionsController.update({
				address: address
			}, updateCollectionData);

			return res.status(200).send({ message: "success" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

export default { create, setBadge, update, importCollection, uploadCollectionImage }