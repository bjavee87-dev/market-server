import axios from "axios";
import colors from "colors";
import { BigNumber, ethers } from "ethers";
import { NFTSync } from "./sync";
import { network } from "../contracts/providers";
import { getNFTContract, marketplaceContract, provider } from "../contracts";
import { BlockNumController } from "../controller/blocknum";
import { NFTMarketDatasController } from "../controller/nft";
import { AlertController } from "../../user/controller";
import AdminWalletController from '../../admin/controller/wallet'
import { refundToBidders } from "../../tradingEngine/service";
import { CollectionsController, NFTItemsController, NFTOrderBookController, NFTMetaDatasController, ActivitiesController, CollectionCacheController, PaylableTokensController, ActionController } from "../controller";
import { formatUnit } from "../../utils/bigmath";
import Abis from '../../blockchain/contracts/abi/abis.json'
import Addresses from '../../blockchain/contracts/abi/addresses.json';
import { Now, getValidHttpUrl, handleEvent } from "../../utils";
import { decodeByte32String, getImgFromTokenId, getTransaction } from "../../utils/blockchain";


const nftHandler = async (tx: any, id: string) => {
	try {
		if (tx.event === 'Transfer') {
			const txReceipt = await provider?.getTransactionReceipt(tx.transactionHash)
			for(let i = 0; i< txReceipt.logs?.length; i++) {
				const log = txReceipt.logs[i];
				if(log.data !== "0x") {
					const _interface = new ethers.utils.Interface(Abis.Marketplace)
					const event = _interface.parseLog(log)
					if(event.name === "NFTTransfered") {
						return;
					}
				}
			}
			let txData = {
				from: tx.args.from,
				to: tx.args.to,
				tokenId: String(tx.args.tokenId)
			};
			// new nft
			const nftManageWallet = (await AdminWalletController.findOne({ type: "nft" }))?.publickey;
			if (txData?.to?.toUpperCase() !== Addresses.market.toUpperCase() && txData?.to?.toUpperCase() !== nftManageWallet.toUpperCase()) {
				console.log("detect nft transfer", id, txData)
				const existsNft = await NFTMetaDatasController.findOne({ 
					id: txData.tokenId,
					nftCollection: id
				})
				if (!existsNft) {
					const contract = getNFTContract(id);
					try {
						const metaHash = await contract.tokenURI(txData.tokenId);
						let tokenUri = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com");
						var error: any = null, metadata: any = {};
						try {
							metadata = await axios.get(tokenUri);
						} catch (err) {
							error = err.message;
							console.log(err.message)
							return;
						}
						console.log(metadata)
						metadata = metadata.data || {};
						await NFTMetaDatasController.create({
							nftCollection: id.toUpperCase(),
							id: txData.tokenId,
							metaHash: metaHash,
							name: metadata.name,
							description: metadata.description,
							externalSite: metadata.external_url ||"",
							image: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
							coverImage: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
							attributes: metadata.attributes,
							error: '',
							views: 0,
							favs: 0,
							reacts: [],
							network: network
						});
						await NFTItemsController.create({
							id: txData.tokenId,
							nftCollection: id.toUpperCase(),
							owner: txData.to,
							creator: txData.to,
							hide: false,
							pick: false,
							onChain: false
						});
						await NFTMarketDatasController.create({
							nftCollection: id.toUpperCase(),
							id: txData.tokenId,
							acceptedToken: "ETH",
							price: 0,
							saleType: "",
							owner: txData.from,
							expiredTime: 0,
							updatedBlockNum: 0,
							multiple: false
						});
						await NFTOrderBookController.create({
							nftCollection: id.toUpperCase(),
							id: txData.tokenId,
							acceptedToken: "ETH",
							price: 0,
							type: "",
							owner: txData.to,
							startTime: 0,
							endTime: 0,
							created: Now(),
							// bidders: [],
							updatedBlockNum: 0
						});
						await ActivitiesController.create({
							nftCollection: id.toUpperCase(),
							tokenid: txData.tokenId,
							type: "Created",
							params: [
								{
									type: "from",
									value: txData.to
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
						await AlertController.create({
							type: "nft",
							email: "",
							address: txData.to,
							from: "admin",
							title: "New NFT detected",
							content: "Your new NFT created successfully",
							created: Now(),
							status: "pending",
							deleted: false,
							collection: id.toUpperCase(),
							tokenId: txData.tokenId,
							img: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
						})
						// if(!existsNft || existsNft?.length === 0) {
						let items= await CollectionCacheController.findOne({address: id.toUpperCase()}) as any;
						items = items?.items || 0
						await CollectionCacheController.update({
							address: id.toUpperCase()
						}, {
							items: items + 1
						})
						// }
					} catch (err) {
						//default data
						console.log(err)
					}
				} else {
					await NFTItemsController.update({
						id: txData.tokenId,
						nftCollection: id.toUpperCase()
					}, {
						owner: txData.to
					});
					
					await NFTMarketDatasController.update({
						id: txData.tokenId,
						nftCollection: id.toUpperCase()
					}, {
						owner: txData.to
					});
					
					await NFTOrderBookController.update({
						id: txData.tokenId,
						nftCollection: id.toUpperCase()
					}, {
						owner: txData.to
					});
					
					await ActivitiesController.create({
						nftCollection: id.toUpperCase(),
						tokenid: txData.tokenId,
						type: "Transfer",
						params: [
							{
								type: "from",
								value: txData.from 
							},
							{
								type: "to",
								value: txData.to
							},
							{
								type: "created",
								value: Now()
							}
						]
					});
				}
			}
		}
	} catch (err) {
		if (err.reason === "missing response") {
			console.log(colors.red("you seem offline"));
		}
		else if(err.reason === "could not detect network") {
			console.log(colors.red("could not detect network"));
		}
		else {
			console.log('handleTransation/nftHandler error:', err.message);
		}
	}
}

const marketHandler = async (tx: any, id: string) => {
	try {
		// market events
		if (tx.event === 'SellCreated') {
			let txData = {
				collection: tx.args.collection,
				nftid: BigNumber.from(tx.args.NFTId).toString(),
				acceptedToken: tx.args.paymentTokenAddress,
				price: BigNumber.from(tx.args.price).toString(),
				startTime: Number(BigNumber.from(tx.args.startTime).toString()),
				endTime:  Number(BigNumber.from(tx.args.endTime).toString()),
			};
			console.log('detect sell create', txData);

			const rawTx = await getTransaction(tx.transactionHash)
			const from = rawTx?.from;
			const tokenInfo = await PaylableTokensController.find({
				address: txData.acceptedToken
			});
			const tokenSymbol = tokenInfo?.[0]?.symbol || "ETH";
			const tokenDecimals = tokenInfo?.[0]?.decimals || 18;
			const tokenPrice = formatUnit(txData.price, tokenDecimals) || 0;
			const collection = await CollectionsController.findOne({ address: txData.collection })
			if (!collection.isLazyMint) {
				const contract = getNFTContract(txData.collection);
				try {
					const metaHash = await contract.tokenURI(txData.nftid);
					let tokenUri = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com");
					var metadata: any = {};
					try {
						metadata = await axios.get(tokenUri);
					} catch (err) {
						error = err.message;
						console.log(err.message)
						return;
					}
					metadata = metadata.data || {};
					const existsNft = await NFTMetaDatasController.find({id: txData.nftid, nftCollection: txData.collection.toUpperCase()});
					await NFTMetaDatasController.create({
						nftCollection: txData.collection,
						id: txData.nftid,
						metaHash: metaHash,
						name: metadata.name,
						description: metadata.description,
						externalSite: metadata.external_url ||"",
						image: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
						coverImage: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
						attributes: metadata.attributes,
						error: '',
						views: 0,
						favs: 0,
						reacts: [],
						network: network
					});
					if(existsNft) {
						await NFTItemsController.update({
							id: txData.nftid,
							nftCollection: txData.collection.toUpperCase()
						}, {
							owner: from
						});
					}
					else {
						await NFTItemsController.create({
							id: txData.nftid,
							nftCollection: txData.collection.toUpperCase(),
							owner: from,
							creator: from,
							hide: false,
							pick: false,
							onChain: false
						});
					}
					await NFTMarketDatasController.create({
						nftCollection: txData.collection.toUpperCase(),
						id: txData.nftid,
						acceptedToken: tokenSymbol,
						price: Number(tokenPrice),
						saleType: "regular",
						owner: from,
						expiredTime: txData.endTime,
						updatedBlockNum: 0,
						multiple: false
					});
					await NFTOrderBookController.create({
						nftCollection: txData.collection.toUpperCase(),
						id: txData.nftid,
						acceptedToken: tokenSymbol,
						price: Number(tokenPrice),
						type: "regular",
						owner: from,
						startTime: txData.startTime,
						endTime: txData.endTime,
						created: Now(),
						// bidders: [],
						updatedBlockNum: 0
					});
					await ActivitiesController.create({
						nftCollection: txData.collection.toUpperCase(),
						tokenid: txData.nftid,
						type: "Listed",
						params: [
							{
								type: "acceptedToken",
								value: tokenSymbol
							},
							{
								type: "price",
								value: Number(tokenPrice)
							},
							{
								type: "from",
								value: from
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
					let collectionInfo= await CollectionCacheController.findOne({address: txData.collection.toUpperCase()}) as any;
					const items = collectionInfo?.items || 0;
					await CollectionCacheController.update(
						{
							address: txData.collection.toUpperCase()
						}, 
						{
							items: items + 1
						}
					);
					const floor = collectionInfo?.floor || 0;
					if(floor === 0 || Number(tokenPrice) < floor) {
						await CollectionCacheController.update(
							{
								address: txData.collection.toUpperCase()
							}, 
							{
								floor: Number(tokenPrice)
							}
						)
					}
				} catch (err) {
					//default data
					console.log(err)
				}
			}
		}
		if (tx.event === 'AuctionCreated') {
			let txData = {
				collection: tx.args.collection,
				nftid: BigNumber.from(tx.args.NFTId).toString(),
				acceptedToken: tx.args.paymentTokenAddress,
				price: BigNumber.from(tx.args.price).toString(),
				startTime: Number(BigNumber.from(tx.args.startTime).toString()),
				endTime:  Number(BigNumber.from(tx.args.endTime).toString()),
			};
			console.log('detect create auction', txData);
			const rawTx = await getTransaction(tx.transactionHash)
			const from = rawTx?.from;			
			const tokenInfo = await PaylableTokensController.find({
				address: txData.acceptedToken
			});
			const tokenSymbol = tokenInfo?.[0]?.symbol || "ETH";
			const tokenDecimals = tokenInfo?.[0]?.decimals || 18;
			const tokenPrice = formatUnit(txData.price, tokenDecimals) || 0;
			const collection = await CollectionsController.findOne({ address: txData.collection })
			if (!collection.isLazyMint) {
				const contract = getNFTContract(txData.collection);
				try {
					const metaHash = await contract.tokenURI(txData.nftid);
					let tokenUri = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
					var error: any = null, metadata: any = {};
					try {
						metadata = await axios.get(tokenUri);
					} catch (err) {
						error = err.message;
						console.log(err.message)
						return;
					}
					metadata = metadata.data || {};
					
					const existsNft = await NFTMetaDatasController.find({id: txData.nftid, nftCollection: txData.collection.toUpperCase()});
					await NFTMetaDatasController.create({
						nftCollection: txData.collection,
						id: txData.nftid,
						metaHash: metaHash,
						name: metadata.name,
						description: metadata.description,
						externalSite: metadata.external_url ||"",
						image: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
						coverImage: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
						attributes: metadata.attributes,
						error: '',
						views: 0,
						favs: 0,
						reacts: [],
						network: network
					});
					if(existsNft) {
						await NFTItemsController.update({
							id: txData.nftid,
							nftCollection: txData.collection.toUpperCase()
						}, {
							owner: from
						});
					}
					else {
						await NFTItemsController.create({
							id: txData.nftid,
							nftCollection: txData.collection.toUpperCase(),
							owner: from,
							creator: from,
							hide: false,
							pick: false,
							onChain: false
						});
					}
					await NFTMarketDatasController.create({
						nftCollection: txData.collection.toUpperCase(),
						id: txData.nftid,
						acceptedToken: tokenSymbol,
						price: Number(tokenPrice),
						saleType: "auction",
						owner: from,
						expiredTime: txData.endTime,
						updatedBlockNum: 0,
						multiple: false
					});
					await NFTOrderBookController.create({
						nftCollection: txData.collection.toUpperCase(),
						id: txData.nftid,
						acceptedToken: tokenSymbol,
						price: Number(tokenPrice),
						type: "auction",
						owner: from,
						startTime: txData.startTime,
						endTime: txData.endTime,
						created: Now(),
						// bidders: [],
						updatedBlockNum: 0
					});
					await ActivitiesController.create({
						nftCollection: txData.collection.toUpperCase(),
						tokenid: txData.nftid,
						type: "Listed",
						params: [
							{
								type: "acceptedToken",
								value: tokenSymbol
							},
							{
								type: "price",
								value: Number(tokenPrice)
							},
							{
								type: "from",
								value: from
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
					// if(!existsNft || existsNft?.length === 0) {
					let items= await CollectionCacheController.findOne({address: txData.collection.toUpperCase()}) as any;
					items = items?.items || 0
					await CollectionCacheController.update({
						address: txData.collection.toUpperCase()
					}, {
						items: items + 1
					})
					// }
				} catch (err) {
					//default data
					console.log(err)
				}
			}
		}
		if (tx.event === 'NFTImported') {
			let txData = {
				collection: tx.args.collection,
				nftid: BigNumber.from(tx.args.NFTId).toString(),
				owner: tx.args.owner
			};
			console.log('detect import nft', txData);
			const rawTx = await getTransaction(tx.transactionHash)
			const from = rawTx?.from;
			let collection = await CollectionsController.find({ address: txData.collection })
			if(!collection || collection?.length === 0) {
				const newCollectionData: Collection = {
					address: txData.collection.toUpperCase(),
					owner: tx.args.owner,
					isLazyMint: false,
					pick: false,
					fee: 0.5,
					error: '',
					category: [],
					url: '',
					metadata: {
						name: "Imported collection",
						description: "",
						image: "",
						coverImage: "",
						links: [
							{   
								name: "website",
								link: "",
							},  
							{
								name: "twitter",
								link: ""
							},
							{
								name: "discord",
								link: ""
							},
							{
								name: "instagram",
								link: ''
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
					address: newCollectionData.address,
					items: 0,
					owners: 0,
					volume: 0,
					volumeJpy: 0,
					floor: 0,
					bestoffer: 0,
				})
				NFTSync(newCollectionData.address, [txData.nftid]).then((result) => {
					nftEventHandler(newCollectionData.address);
				})
			}
			const contract = getNFTContract(txData.collection.toUpperCase());
			try {
				const metaHash = await contract.tokenURI(txData.nftid);
				let tokenUri = getValidHttpUrl(metaHash)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
				var error: any = null, metadata: any = {};
				try {
					metadata = await axios.get(tokenUri);
				} catch (err) {
					error = err.message;
					console.log(err.message)
					return;
				}
				metadata = metadata.data || {};
				await NFTMetaDatasController.create({
					nftCollection: txData.collection.toUpperCase(),
					id: txData.nftid,
					metaHash: metaHash,
					name: metadata.name,
					description: metadata.description,
					externalSite: metadata.external_url ||"",
					image: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
					coverImage: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com"),
					attributes: metadata.attributes,
					error: '',
					views: 0,
					favs: 0,
					reacts: [],
					network: network
				});
				await NFTItemsController.create({
					id: txData.nftid,
					nftCollection: txData.collection.toUpperCase(),
					owner: txData.owner,
					creator: from,
					hide: false,
					pick: false,
					onChain: false
				});
				await NFTMarketDatasController.create({
					nftCollection: txData.collection.toUpperCase(),
					id: txData.nftid,
					acceptedToken: "ETH",
					price: 0,
					saleType: "",
					owner: txData.owner,
					expiredTime: Now() + 2592000,
					updatedBlockNum: 0,
					multiple: false
				});
				await NFTOrderBookController.create({
					nftCollection: txData.collection.toUpperCase(),
					id: txData.nftid,
					acceptedToken: "ETH",
					price: 0,
					type: "",
					owner: txData.owner,
					startTime: Now(),
					endTime: Now() + 2592000,
					created: Now(),
					bidders: [],
					updatedBlockNum: 0
				});
				await ActivitiesController.create({
					nftCollection: txData.collection.toUpperCase(),
					tokenid: txData.nftid,
					type: "Imported",
					params: [
						{
							type: "from",
							value: from
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
				await ActivitiesController.create({
					nftCollection: txData.collection.toUpperCase(),
					tokenid: txData.nftid,
					type: "Import",
					params: [
						{
							type: "acceptedToken",
							value: "ETH"
						},
						{
							type: "price",
							value: 0
						},
						{
							type: "from",
							value: from
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
				await AlertController.create({
					type: "nft",
					email: "",
					address: txData.owner,
					from: "admin",
					title: "New NFT detected",
					content: "Your new NFT imported successfully",
					created: Now(),
					status: "pending",
					deleted: false,
					collection: txData.collection.toUpperCase(),
					tokenId: txData.nftid,
					img: getValidHttpUrl(metadata.image)?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
				})
				// if(!existsNft || existsNft?.length === 0) {
				let items= await CollectionCacheController.findOne({address: txData.collection.toUpperCase()}) as any;
				items = items?.items || 0
				await CollectionCacheController.update({
					address: txData.collection.toUpperCase()
				}, {
					items: items + 1
				})
				// }
			} catch (err) {
				//default data
				console.log(err)
			}
		}
		if (tx.event === 'NFTTransfered') {
			let txData = {
				collection: tx.args.collection,
				nftid: BigNumber.from(tx.args.nftId).toString(),
				to: tx.args.to
			};
			console.log('detect transfer nft to internal', txData);

			await NFTMarketDatasController.update(
				{
					nftCollection: txData.collection,
					id: txData.nftid
				},
				{
					owner: txData.to,
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: txData.collection,
					id: txData.nftid
				}, 
				{
					owner: txData.to,
					price: 0,
					startTime: 0,
					endTime: 0,
					expiredTime: 0,
					type: '',
					// bidders: []
				}
			)
			await NFTItemsController.update(
				{
					nftCollection: txData.collection,
					id: txData.nftid
				}, 
				{
					owner: txData.to
				}
			)
			await ActivitiesController.create({
				nftCollection: txData.collection,
				tokenid: txData.nftid,
				type: "Transfer",
				params: [
					{
						type: "price",
						value: 0
					},
					
					{
						type: "acceptedToken",
						value: ""
					},
					{
						type: "from",
						value: ""
					},
					{
						type: "to",
						value: txData.to,
					},
					{
						type: "created",
						value: Now()
					}
				]
			});
			const img = await getImgFromTokenId(txData.collection, txData.nftid);
			await AlertController.create({
				type: "nft",
				email: "",
				address: txData.to,
				from: "Admin",
				title: "You received a NFT",
				content:  "You received NFT " + " (Collection: " + txData.collection + ", TokenId: " + txData.nftid +")",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: txData.collection,
				tokenId: txData.nftid,
				img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
			})
		}
		if (tx.event === "SellCancelled") {
			let txData = {
				collection: tx.args.collection,
				nftid: BigNumber.from(tx.args.NFTId).toString(),
				owner: tx.args.owner
			};			
			console.log('detect cancel sell nft', txData);
			let orderInfo = await NFTOrderBookController.find({
				nftCollection: txData.collection.toUpperCase(),
				id: txData.nftid
			}) as any;
			const bidders = orderInfo?.[0]?.bidders || [];
			await NFTMarketDatasController.update(
				{
					nftCollection: txData.collection.toUpperCase(),
					id: txData.nftid
				},
				{
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: txData.collection,
					id: txData.nftid
				}, 
				{
					price: 0,
					startTime: 0,
					endTime: 0,
					type: '',
					expiredTime: 0,
					bidders: []
				}
			)
			await ActivitiesController.create({
				nftCollection: txData.collection,
				tokenid: txData.nftid,
				type: "List canceled",
				params: [
					{
						type: "acceptedToken",
						value: "ETH"
					},
					{
						type: "price",
						value: 0
					},
					{
						type: "from",
						value: txData.owner
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
			await ActivitiesController.create({
				nftCollection: txData.collection,
				tokenid: txData.nftid,
				type: "List canceled",
				params: [
					{
						type: "acceptedToken",
						value: "ETH"
					},
					{
						type: "price",
						value: 0
					},
					{
						type: "from",
						value: txData.owner
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
			await refundToBidders(bidders, txData.collection, txData.nftid);
		}
		if (tx.event === "PaymentCreated") {
			let txData = {
				orderId: tx.args.orderId,
				paymentTokenAddress: tx.args.paymentTokenAddress,
				amount: tx.args.amount
			};
			const actionId = decodeByte32String(txData.orderId);
			const action = await ActionController.findOne({_id: actionId});
			if(action.paymentType.toUpperCase() === txData.paymentTokenAddress.toUpperCase() && Number(action.amount) <= Number(formatUnit(txData.amount, action.decimals))){
				await ActionController.update({_id: actionId}, {status: "paid"})
			}
			console.log('detect payment', txData);
		}
	} catch (err) {
		console.log('handleTransation/marketHandler error:', err.message);
	}
}

const nftEventHandler = async (address: string, times: number = 15) => {
	handleEvent({
		id: address,
		provider: provider,
		contract: getNFTContract(address),
		event: 'Transfer',
		times: times,
		handler: nftHandler,
		BlockNumController: BlockNumController
	});
}

const marketEventHandler = async (times: number = 15) => {
	handleEvent({
		id: marketplaceContract.address + " SellCreated",
		provider: provider,
		contract: marketplaceContract,
		event: 'SellCreated',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
	handleEvent({
		id: marketplaceContract.address + " AuctionCreated",
		provider: provider,
		contract: marketplaceContract,
		event: 'AuctionCreated',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
	handleEvent({
		id: marketplaceContract.address + " NFTImported",
		provider: provider,
		contract: marketplaceContract,
		event: 'NFTImported',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
	
	handleEvent({
		id: marketplaceContract.address + " NFTTransfered",
		provider: provider,
		contract: marketplaceContract,
		event: 'NFTTransfered',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
	handleEvent({
		id: marketplaceContract.address + " SellCancelled",
		provider: provider,
		contract: marketplaceContract,
		event: 'SellCancelled',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
	handleEvent({
		id: marketplaceContract.address + " PaymentCreated",
		provider: provider,
		contract: marketplaceContract,
		event: 'PaymentCreated',
		times: times,
		handler: marketHandler,
		BlockNumController: BlockNumController,
	});
}

export { nftHandler, marketHandler, nftEventHandler, marketEventHandler }; 