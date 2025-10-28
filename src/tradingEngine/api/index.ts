import { Response, Request } from "express";
import { refundToBidders } from "../service";
import AdminWalletController from '../../admin/controller/wallet'
import { addUserInternalBalance } from "../../balance/api/service";
import { AlertController, UserController } from "../../user/controller";
import { AdminSettingController } from "../../admin/controller/setting";
import { NFTItemsController, NFTMarketDatasController } from "../../blockchain/controller/nft";
import { getMarketplaceContractWithSigner, getNFTContractWithSigner, getNFTsigner, getTreasurysigner } from "../../blockchain/contracts";
import { ActionController, ActivitiesController, CollectionCacheController, CollectionsController, NFTOrderBookController, PaylableTokensController, TradeHistoryController } from "../../blockchain/controller";
import { toChecksumAddress, getL1BlockNumber, paymentSign, encodeByte32String, recoverPersonalData, ZeroAddress, getImgFromTokenId, estimateGasForNFTExport } from "../../utils/blockchain";
import { parseUnit } from "../../utils/bigmath";
import { Now, sign, toBigNum } from "../../utils";
import setlog from "../../utils/setlog";
import Addresses from '../../blockchain/contracts/abi/addresses.json'
import { BalanceRequestController } from "../../balance/controller";

const list = async (req: Request | any, res: Response) => {
	try {
		//in frontend nft owner is external createSell event and transfer to market
		const { collectionid, nftid, price, acceptedToken, startTime, endTime, quantity, type, creator } = req.body;
		const owner = req.user?.address;
		const nftinfo = await NFTMarketDatasController.findOne({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid
		})
		const _owner = nftinfo?.owner;
		if (owner.toUpperCase() !== _owner.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		await NFTMarketDatasController.create({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid,
			price: price,
			saleType: type,
			acceptedToken: acceptedToken,
			expiredTime: endTime,
			owner: creator,
			multiple: false
		})
		await NFTOrderBookController.create({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid,
			type: type,
			acceptedToken: acceptedToken,
			price: price,
			owner: creator,
			// bidders: [],
			startTime: startTime,
			endTime: endTime,
			created: Now(),
			updatedBlockNum: 0,
		});
		await ActivitiesController.create({
			nftCollection: collectionid?.toUpperCase(),
			tokenid: nftid,
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
		if(type === "regular") {
			let collectionInfo= await CollectionCacheController.findOne({address: collectionid?.toUpperCase()}) as any;
			const floor = collectionInfo?.floor || 0;
			if(floor === 0 || Number(price) < floor) {
				await CollectionCacheController.update({
					address: collectionid?.toUpperCase()
				}, {
					floor: Number(price)
				})
			}
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const listReset = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, price, acceptedToken, type, creator, saleStart, saleEnd } = req.body;
		const owner = req.user?.address;
		const nftinfo = await NFTMarketDatasController.findOne({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid
		})
		const _owner = nftinfo?.owner;
		if (owner.toUpperCase() !== _owner.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		await NFTMarketDatasController.update({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid,
			owner: creator
		}, {
			price: price,
			saleType: type,
			acceptedToken: acceptedToken,
			expiredTime: saleEnd
		})
		await NFTOrderBookController.update({
			nftCollection: collectionid?.toUpperCase(),
			id: nftid
		}, {
			type: type,
			acceptedToken: acceptedToken,
			price: price,
			startTime: saleStart,
			endTime: saleEnd
		});
		await ActivitiesController.create({
			nftCollection: collectionid?.toUpperCase(),
			tokenid: nftid,
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
		if(type === "regular") {
			let collectionInfo= await CollectionCacheController.findOne({address: collectionid?.toUpperCase()}) as any;
			const floor = collectionInfo?.floor || 0;
			if(floor === 0 || Number(price) < floor) {
				await CollectionCacheController.update({
					address: collectionid?.toUpperCase()
				}, {
					floor: Number(price)
				})
			}
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const cancelSell = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, isMetamask } = req.body;
		const owner = req.user?.address;
		const nftinfo = await NFTMarketDatasController.findOne({
			nftCollection: collectionid,
			id: nftid
		})
		const _owner = nftinfo?.owner;
		const nftAdminKey = (await AdminWalletController.findOne({type: "nft"}))?.privatekey || null;
		if (owner.toUpperCase() !== _owner.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		const ca = getNFTContractWithSigner(collectionid, nftAdminKey);
		let nftowner = null;
		try {
			nftowner = await ca.ownerOf(nftid);
		} catch (err) {
		}
		if(isMetamask ) {
			if(!nftowner || nftowner?.toUpperCase() !== Addresses.market.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		}
		if(isMetamask) {
			let blockNumber = await getL1BlockNumber();
			const deadline = (blockNumber + 60) ;
			const signer = await getNFTsigner()
			const signature = await sign(
				["string", "address", "uint", "address", "uint"],
				["cancelSell", toChecksumAddress(collectionid), nftid, toChecksumAddress(owner), deadline],
				signer
			);
			return res.status(200).send({ message: "success", deadline: deadline, signature: signature});
		}
		else {
			let orderInfo = await NFTOrderBookController.find({
				nftCollection: collectionid,
				id: nftid
			}) as any;
			const bidders = orderInfo?.[0]?.bidders || [];
			await NFTMarketDatasController.update(
				{
					nftCollection: collectionid,
					id: nftid
				},
				{
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
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
				nftCollection: collectionid,
				tokenid: nftid,
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
			await refundToBidders(bidders, collectionid, nftid);
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const transfer = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, to } = req.body;
		const owner = req.user?.address;
		const nftinfo = await NFTMarketDatasController.findOne({
			nftCollection: collectionid,
			id: nftid
		})
		const _owner = nftinfo?.owner;
		if (owner.toUpperCase() !== _owner.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		const toInfo = await UserController.find({filter: {
			address: to
		}})
		let isMinted: boolean = false;
		const nftAdminKey = (await AdminWalletController.findOne({type: "nft"}))?.privatekey || null;
		const ca = getNFTContractWithSigner(collectionid, nftAdminKey);
		let nftowner = null;
		try {
			nftowner = await ca.ownerOf(nftid);
			if(nftowner) isMinted = true;
		} catch (err) {
			isMinted = false;
		}
		const toIsMetamask = toInfo?.length === 0 || toInfo[0]?.metamask;
		let tx = null;
		const nftAdminAddress = (await AdminWalletController.findOne({type: "nft"}))?.publickey || null;
		if(toIsMetamask) {
			if(isMinted) {
				if(nftowner === Addresses.market) {  // in market contract
					const signer = await getNFTsigner()
					const marketCa = getMarketplaceContractWithSigner(signer);
					const tx = await marketCa.exportNFT(toChecksumAddress(collectionid), nftid, toChecksumAddress(to));
					await tx.wait();
				}
			}
			else {
				const tokenId = nftid.length === 64 ? "0x" + nftid : nftid;
				tx = await ca.mint(tokenId)
				await tx.wait()
				tx = await ca.transferFrom(toChecksumAddress(nftAdminAddress), toChecksumAddress(to), tokenId)
				await tx.wait()
			}
		}
		else {
			return res.status(200).send({ message: "tointernal" });
		}
		await NFTMarketDatasController.update(
			{
				nftCollection: collectionid,
				id: nftid
			},
			{
				owner: to,
				price: 0,
				saleType: "",
				expiredTime: 0
			}
		)
		await NFTOrderBookController.update(
			{
				nftCollection: collectionid,
				id: nftid
			}, 
			{
				owner: to,
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
				nftCollection: collectionid,
				id: nftid
			}, 
			{
				owner: to
			}
		)
		await ActivitiesController.create({
			nftCollection: collectionid,
			tokenid: nftid,
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
					value: owner
				},
				{
					type: "to",
					value: to,
				},
				{
					type: "created",
					value: Now()
				}
			]
		});
		const img = await getImgFromTokenId(collectionid, nftid);
		await AlertController.create({
			type: "nft",
			email: toInfo[0]?.email,
			address: to,
			from: owner,
			title: "Transfered NFT from " + owner,
			content:  "You received NFT from " + owner + " (Collection: " + collectionid + ", TokenId: " + nftid +")",
			created: Now(),
			status: "pending",
			deleted: false,
			collection: collectionid,
			tokenId: nftid,
			img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
		})
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const withdraw = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, to, feeToken } = req.body;
		const owner = req.user?.address;
		const nftinfo = await NFTMarketDatasController.findOne({
			nftCollection: collectionid,
			id: nftid
		})
		const _owner = nftinfo?.owner;
		if (owner.toUpperCase() !== _owner.toUpperCase()) return res.status(200).send({ message: "not nft owner" });
		let userInfo = await UserController.find({
            filter: {
                address: owner
            }
        }) as any;
        if (userInfo.length === 0) {
            return res.status(200).send({ message: "not nft owner" });
        } else {
            userInfo = userInfo[0];
			if(!userInfo?.metamask) {
				const balances = userInfo?.balances;
				const feeBalance = balances?.find((b) => {return b.symbol === feeToken})?.balance || 0;
				const tokenInfo = await PaylableTokensController.find({
					symbol: feeToken
				});
				const tokenprice = Number(tokenInfo?.[0]?.usd || 1);

				const { gasPrice, gasLimit, gasFee} = await estimateGasForNFTExport(collectionid, nftid);
				const ethToken = await PaylableTokensController.find({
					symbol: "ETH"
				});
				const ethPrice = ethToken?.[0]?.usd || 2000;
				const usdPrice = Number(gasFee) * Number(ethPrice);
				const feeAmount = usdPrice / tokenprice;

				console.log("exportFeeAmount: " + ethPrice, usdPrice, feeAmount );

				if(Number(feeBalance)  < feeAmount) {
					return res.status(200).send({ message: "out of fee" });
				}
				let newBalance = [], flag = false;
				balances?.forEach(element => {
					if (element?.symbol != feeToken) {
						newBalance.push(element)
					}
					else {
						newBalance.push({
							address: element?.address,
							name: element?.name,
							symbol: element?.symbol,
							decimals: element?.decimals,
							icon: element?.icon,
							balance: (Number(element?.balance) - Number(feeAmount )).toString()
						})
						flag = true;
					}
				});
				if (!flag) {
					const tokenInfo = await PaylableTokensController.find({
						symbol: feeToken
					});
					const token = tokenInfo[0];
					if (token) {
						newBalance.push({
							address: token?.address,
							name: token?.name,
							symbol: token?.symbol,
							decimals: token?.decimals,
							icon: token?.icon,
							balance: (0 - feeAmount).toString()
						})
					}
				}
				await UserController.update({
					filter: { address: owner },
					update: { balances: newBalance }
				})
			}

			const toInfo = await UserController.find({filter: {
				address: to
			}})
			let isMinted: boolean = false;
			const nftAdminKey = (await AdminWalletController.findOne({type: "nft"}))?.privatekey || null;
			const ca = getNFTContractWithSigner(collectionid, nftAdminKey);
			let nftowner = null;
			try {
				nftowner = await ca.ownerOf(nftid);
				if(owner) isMinted = true;
			} catch (err) {
				// console.log(err.message)
				isMinted = false;
			}
			
			//transfer nft to external wallet
			const toIsMetamask = toInfo?.length === 0 || toInfo[0]?.metamask;
			let tx = null;
			const nftAdminAddress = (await AdminWalletController.findOne({type: "nft"}))?.publickey || null;
			if(toIsMetamask) {
				if(isMinted) {
					if(nftowner === Addresses.market) {  // in market contract
						const signer = await getNFTsigner()
						const marketCa = getMarketplaceContractWithSigner(signer);
						const tx = await marketCa.exportNFT(toChecksumAddress(collectionid), nftid, toChecksumAddress(to));
						await tx.wait();
						console.log("exportNFT", tx)
					}
				}
				else {
					const tokenId = nftid.length === 64 ? "0x" + nftid : nftid;
					tx = await ca.mint(tokenId)
					await tx.wait()
					tx = await ca.transferFrom(toChecksumAddress(nftAdminAddress), toChecksumAddress(to), tokenId)
					await tx.wait()
					console.log("transferNFT", tx)
				}
			}

			//update nft owner in db
			await NFTMarketDatasController.update(
				{
					nftCollection: collectionid,
					id: nftid
				},
				{
					owner: to,
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: to,
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
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: to
				}
			)
			await ActivitiesController.create({
				nftCollection: collectionid,
				tokenid: nftid,
				type: "Export",
				params: [
					{
						type: "price",
						value: 0
					},
					{
						type: "from",
						value: owner
					},
					{
						type: "to",
						value: to,
					},
					{
						type: "created",
						value: Now()
					}
				]
			});
		
			const img = await getImgFromTokenId(collectionid, nftid);
			await AlertController.create({
				type: "nft",
				email: "",
				address: to,
				from: owner,
				title: "Exported NFT from " + owner,
				content:  "You received NFT from " + owner + " (Collection: " + collectionid + ", TokenId: " + nftid +")",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: collectionid,
				tokenId: nftid,
				img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
			});
			return res.status(200).send({ message: "success" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const acceptBid = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, _id, signature } = req.body;
		const creator = req.user?.address;
		const isMetamask = req.user?.isMetamask;
		if(isMetamask) {
			const recoverData = recoverPersonalData(`Do you want to accept bid? \n Wallet address: ${creator}`, signature)
			if(recoverData !== creator) return res.status(200).json({message: "invalid signature"}); 
		}
		let nftInfo = await NFTMarketDatasController.find({
			nftCollection: collectionid,
			id: nftid,
		}) as any;
		
		let orderInfo = await NFTOrderBookController.find({
			nftCollection: collectionid,
			id: nftid,
		}) as any;

		if(!nftInfo  || nftInfo.length === 0 ) return res.status(200).send({message: "could not found selling nft"});
		if(!orderInfo  || orderInfo.length === 0 ) return res.status(200).send({message: "could not found selling nft"});
		nftInfo = nftInfo[0] ;
		orderInfo = orderInfo[0] ;
		const bidders: Bid[] = orderInfo?.bidders  || [] ;
		const bid = bidders.find((bd) => {
			return bd._id?.toString() == _id
		});
		if(!bid) return res.status(200).json({message: "not exists bid"}); 

		const nftowner = orderInfo?.owner;
		if(nftowner !== creator) {
			return  res.status(200).send({ message: "not owner" });
		}
		const sellerInfo = await UserController.find({
			filter: {
				address: nftowner
			}
		})
		const isSellerMetamask = !sellerInfo || sellerInfo?.length === 0 || sellerInfo[0]?.metamask;
		const seller = sellerInfo[0].address;
		const bidder = bidders?.find(bid => bid._id == _id)?.bidder || "";
		const bidPrice = bidders?.find(bid => bid._id == _id)?.price || 0;
		const bidToken = bidders?.find(bid => bid._id == _id)?.acceptedToken || "ETH";
		if(!bidder) return res.status(200).send({message: "could not found bidder"});

		let bidderInfo = await UserController.find({
            filter: {
                address: bidder
            }
        }) as any;
        if (bidderInfo.length === 0) {
			return res.status(200).send({message: "could not found bidder"});
        } else {
			//move nft
			const bidderIsMetamask = bidderInfo?.length === 0 || bidderInfo[0]?.metamask;
			let isMinted: boolean = false;
			const nftAdminKey = (await AdminWalletController.findOne({type: "nft"}))?.privatekey || null;
			const ca = getNFTContractWithSigner(collectionid, nftAdminKey);
			let owner = null;
			try {
				owner = await ca.ownerOf(nftid);
				if(owner) isMinted = true;
			} catch (err) {
				isMinted = false;
			}
			const nftAdminAddress = (await AdminWalletController.findOne({type: "nft"}))?.publickey || null;
			if(bidderIsMetamask) {
				if(isMinted) {
					if(owner === Addresses.market) {  // in market contract
						const signer = await getNFTsigner()
						const marketCa = getMarketplaceContractWithSigner(signer);
						console.log("export NFT to bidder if bidder is metamask")
						const tx = await marketCa.exportNFT(toChecksumAddress(collectionid), nftid, toChecksumAddress(bidder));
						await tx.wait();
					}
				}
				else {
					const tokenId = nftid.length === 64 ? "0x" + nftid : nftid;
					console.log("nft mint")
					let tx = await ca.mint(tokenId)
					await tx.wait()
					const tx2 = await ca.transferFrom(toChecksumAddress(nftAdminAddress), toChecksumAddress(bidder), tokenId)
					await tx2.wait()
				}
			}

			//change nft owner
			await NFTMarketDatasController.update(
				{
					nftCollection: collectionid,
					id: nftid
				},
				{
					owner: bidder,
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: bidder,
					price: 0,
					startTime: 0,
					endTime: 0,
					type: '',
					expiredTime: 0,
					bidders: []
				}
			)
			await NFTItemsController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: bidder
				}
			)
			await ActivitiesController.create({
				nftCollection: collectionid,
				tokenid: nftid,
				type: "Sell",
				params: [
					{
						type: "price",
						value: bidPrice
					},
					{
						type: "acceptedToken",
						value: bidToken
					},
					{
						type: "quantity",
						value: 1
					},
					{
						type: "from",
						value: nftInfo?.owner
					},
					{
						type: "to",
						value: bidder
					},
					{
						type: "created",
						value: Now()
					}
				]
			});
			
			//add trade volume
			let totalVolume: any = await CollectionCacheController.findOne({address: collectionid.toUpperCase()});
			totalVolume = totalVolume?.volume || 0;
			let volumeJpy = totalVolume?.volumeJpy || 0;
			const tokens = await PaylableTokensController.find({});
			let ethValue = 0, usdValue = 0, jpyValue = 0;
			usdValue = Number(bidPrice) * (tokens.find((token) => {return token.symbol === bidToken}).usd || 0); 
			jpyValue = Number(bidPrice) * (tokens.find((token) => {return token.symbol === bidToken}).jpy || 0); 
			if(bidToken === "ETH") {
				ethValue = bidPrice;
			} else {
				ethValue = Number(usdValue) /  (tokens.find((token) => {return token.symbol === "ETH"}).usd || 1);
			}
			totalVolume = totalVolume + usdValue;
			volumeJpy = volumeJpy + jpyValue;
			await CollectionCacheController.update({
				address: collectionid.toUpperCase()
			}, {
				volume: totalVolume,
				volumeJpy: volumeJpy
			})

			const collectionInfo = await CollectionsController.find({address: collectionid.toUpperCase()})
			const fee = collectionInfo?.[0]?.fee || 0.5;
			const serviceFee = (await AdminSettingController.getSetting())?.nftTradeFee || 1;
			const creator = toChecksumAddress(collectionInfo?.[0]?.owner);
			const sellerReturnAmount = Number(Number(bidPrice - (bidPrice / 100 * (fee + serviceFee))).toFixed(8));
			const creatorFeeAmount = Number( Number(bidPrice / 100 * fee).toFixed(8));
			const tokenInfo = await PaylableTokensController.find({
				symbol: bidToken
			});
			const token = tokenInfo[0];

			//add alert and history
			const img = await getImgFromTokenId(collectionid, nftid);
			await AlertController.create({
				type: "nft",
				email: "",
				address: bidder,
				from: seller,
				title: "Your bid request accepted",
				content:  "Your bid request accepted from " + seller + " (Collection: " + collectionid + ", TokenId: " + nftid +")",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: collectionid,
				tokenId: nftid,
				img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
			})
			await AlertController.create({
				type: "nft",
				email: "",
				address: seller,
				from: "admin",
				title: "Selled your NFT",
				content:  "You sell NFT to " + bidder + " (Collection: " + collectionid + ", TokenId: " + nftid +")",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: collectionid,
				tokenId: nftid,
				img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
			})
			const date = new Date().toLocaleDateString();
			const feeSymbol = (bidPrice / 100 * (serviceFee));
			const feeJpy = feeSymbol * (tokens.find((token) => {return token.symbol === bidToken}).jpy || 0); 
			await TradeHistoryController.create({
				date: date,
				tradeVolumeUsd: usdValue,
				tradeVolumeJpy: jpyValue,
				symbol: bidToken,
				tradeVolumeSymbol: bidPrice,
				feeSymbol: feeSymbol,
				feeJpy: feeJpy
			})
			
			//return money to seller, collectionCreator, bidders
			if(isSellerMetamask) {
				await BalanceRequestController.create({
					email: "",
					from: "admin",
					to: seller,
					amount: sellerReturnAmount.toString(),
					type: "transfer",
					tokenAddress: toChecksumAddress(token.address),
					tokenName: token.name,
					created: Now(),
					tx: "",
					status: "pending"
				})
			}
			else {
				await addUserInternalBalance([seller], token.address, [sellerReturnAmount])
			}
			
			//send creator fee
			await addUserInternalBalance([creator], token.address, [creatorFeeAmount])
			
			//refund bidders
			if(bidders?.length > 0) {
				const _bids = [];
				bidders.forEach(bid => {
					if(bid._id.toString() != _id) {
						_bids.push(bid)
					}
				});
				await refundToBidders(_bids, collectionid, nftid)
			}
			return res.status(200).send({ message: "success" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const buyNow = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, quantity} = req.body;
		const buyer = req.user?.address;
		const buyerInfo = await UserController.find({
			filter: {
				address: buyer
			}
		})
		const isMetamask = !buyerInfo || buyerInfo?.length === 0 || buyerInfo[0]?.metamask;
		const onProcessingBuy = await ActionController.findOne({
			'params.collection':  collectionid.toUpperCase(),
			"params.nftid": nftid
		})
		if(onProcessingBuy) return res.status(200).send({message: "processing by other user"});

		let nftInfo = await NFTMarketDatasController.find({
			nftCollection: collectionid,
			id: nftid,
			saleType: "regular"
		}) as any;
		
		let orderInfo = await NFTOrderBookController.find({
			nftCollection: collectionid,
			id: nftid,
			type: "regular"
		}) as any;

		if(!nftInfo  || nftInfo.length === 0 ) return res.status(200).send({message: "could not found selling nft"});
		if(!orderInfo  || orderInfo.length === 0 ) return res.status(200).send({message: "could not found selling nft"});
		nftInfo = nftInfo[0] ;
		orderInfo = orderInfo[0] ;
		const bidders = orderInfo.bidders;

		const price = nftInfo?.price || 0;		
		const seller = nftInfo?.owner;
		const sellerInfo = await UserController.find({
			filter: {
				address: seller
			}
		})
		const isSellerMetamask = !sellerInfo || sellerInfo?.length === 0 || sellerInfo[0]?.metamask;

		const acceptedToken = nftInfo?.acceptedToken || "ETH";
		const tokenInfo = await PaylableTokensController.find({
			symbol: acceptedToken
		});
		const token = tokenInfo[0];
		if(isMetamask) {
			let orderId = await ActionController.create({
				email: "",
				from: buyer, 
				to: Addresses.market, 
				amount: price.toString(), 
				paymentType: token.address,
				tokenName: acceptedToken,
				decimals: token.decimals || 18,
				actionName: "Buy NFT payment",
				created: Now(),
				status: "pending",
				params: {
					collection: collectionid,
					nftid: nftid,
					price: price,
					acceptedToken: acceptedToken,
					from: nftInfo?.owner,
					to: buyer
				}
			});
			orderId = encodeByte32String( orderId.toString());
			const signer = await getNFTsigner()
			let blockNumber = await getL1BlockNumber();
			const deadline = (blockNumber + 60) ;
			const signature = await paymentSign({
				type:"payment", 
				orderId: orderId, 
				paymentTokenAddress: token.address, 
				amount: parseUnit(price, token.decimals),
				deadline: deadline,
				signer: signer
			})
			return res.status(200).send({message: "success", signature, deadline, orderId});
		}
		else {
			const balances = buyerInfo[0]?.balances;
			const tokenBalance = balances?.find((b) => {return b.symbol === acceptedToken})?.balance || 0;
			if(Number(tokenBalance) < Number(price * quantity)) return res.status(200).send({ message: "exceed balance"});
			

			//change nft owner
			await NFTMarketDatasController.update(
				{
					nftCollection: collectionid,
					id: nftid
				},
				{
					owner: buyer,
					price: 0,
					saleType: "",
					expiredTime: 0
				}
			)
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: buyer,
					price: 0,
					startTime: 0,
					endTime: 0,
					type: '',
					expiredTime: 0,
					bidders: []
				}
			)
			await NFTItemsController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					owner: buyer
				}
			)
			await ActivitiesController.create({
				nftCollection: collectionid,
				tokenid: nftid,
				type: "Sell",
				params: [
					{
						type: "price",
						value: price
					},
					{
						type: "acceptedToken",
						value: acceptedToken
					},
					{
						type: "quantity",
						value: quantity
					},
					{
						type: "from",
						value: nftInfo?.owner
					},
					{
						type: "to",
						value: buyer
					},
					{
						type: "created",
						value: Now()
					}
				]
			});

			//add trade volume
			let totalVolume: any = await CollectionCacheController.findOne({address: collectionid.toUpperCase()});
			totalVolume = totalVolume?.volume || 0;
			let volumeJpy = totalVolume?.volumeJpy || 0;
			const tokens = await PaylableTokensController.find({});
			let ethValue = 0, usdValue = 0, jpyValue = 0;
			usdValue = Number(price) * (tokens.find((token) => {return token.symbol === acceptedToken}).usd || 0); 
			jpyValue = Number(price) * (tokens.find((token) => {return token.symbol === acceptedToken}).jpy || 0); 	
			if(acceptedToken === "ETH") {
				ethValue = price;
			} else {
				ethValue = Number(usdValue) /  (tokens.find((token) => {return token.symbol === "ETH"}).usd || 1);
			}
			totalVolume = totalVolume + usdValue;
			volumeJpy = volumeJpy + jpyValue;
			await CollectionCacheController.update({
				address: collectionid.toUpperCase()
			}, {
				volume: totalVolume,
				volumeJpy: volumeJpy
			})
			
			const collectionInfo = await CollectionsController.find({address: collectionid.toUpperCase()})
			const fee = collectionInfo?.[0]?.fee || 0.5;
			const serviceFee = (await AdminSettingController.getSetting())?.nftTradeFee || 1;
			const creator = toChecksumAddress(collectionInfo?.[0]?.owner);
			const sellerReturnAmount = Number(Number(price - (price / 100 * (fee + serviceFee))).toFixed(8));
			const creatorFeeAmount = Number(price / 100 * fee).toFixed(8);

			//add alert and history
			const img = await getImgFromTokenId(collectionid, nftid);
			await AlertController.create({
				type: "nft",
				email: "",
				address: nftInfo.owner,
				from: buyer,
				title: "Selled your NFT",
				content:  "You sell NFT to " + buyer + " (Collection: " + collectionid + ", TokenId: " + nftid +")",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: collectionid,
				tokenId: nftid,
				img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com")
			})
			const date = new Date().toLocaleDateString();
			const feeSymbol = (price / 100 * (serviceFee));
			const feeJpy = feeSymbol * (tokens.find((token) => {return token.symbol === acceptedToken}).jpy || 0); 
			await TradeHistoryController.create({
				date: date,
				tradeVolumeUsd: usdValue,
				tradeVolumeJpy: jpyValue,
				symbol: acceptedToken,
				tradeVolumeSymbol: price,
				feeSymbol: feeSymbol,
				feeJpy: feeJpy
			})
			
			//user balance change
			const addBalance = await addUserInternalBalance([buyer], acceptedToken, [-Number(price * quantity)])
			if(!addBalance) {
				return res.status(200).send({ message: "balance error"});
			}

			//return money to seller, collectionCreator, bidders
			if(isSellerMetamask) {
				await BalanceRequestController.create({
					email: "",
					from: "admin",
					to: seller,
					amount: sellerReturnAmount.toString(),
					type: "transfer",
					tokenAddress: toChecksumAddress(token.address),
					tokenName: token.name,
					created: Now(),
					tx: "",
					status: "pending"
				})
			}
			else {
				await addUserInternalBalance([seller], token.address, [sellerReturnAmount])
			}

			//creator fee
			await addUserInternalBalance([creator], token.address, [creatorFeeAmount])
			
			if(bidders?.length > 0) {
				await refundToBidders(bidders, collectionid, nftid)
			}
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const bid = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, price, acceptedToken } = req.body;
		const user = req.user?.address;
		const bidderInfo = await UserController.find({
			filter: {
				address: user
			}
		})
		const isMetamask = !bidderInfo || bidderInfo?.length === 0 || bidderInfo[0]?.metamask;
		const tokenInfo = await PaylableTokensController.find({
			symbol: acceptedToken
		});
		const token = tokenInfo[0];
		let orders = await NFTOrderBookController.find({
			nftCollection: collectionid,
			id: nftid
		}) as any
		const bidders = orders?.[0]?.bidders  || [];
		const endTime = orders?.[0]?.endTime || 0;
		if(isMetamask) {
			let orderId = await ActionController.create({
				email: "",
				from: user, 
				to: Addresses.market, 
				amount: price.toString(), 
				paymentType: token.address,
				tokenName: acceptedToken,
				decimals: token.decimals || 18,
				actionName: "Bid NFT payment",
				created: Now(),
				status: "pending",
				params: {
					collection: collectionid,
					nftid: nftid,
					price: Number(price),
					acceptedToken: acceptedToken,
					from: user,
					expiration: endTime,
					to: Addresses.market
				}
			});
			orderId = encodeByte32String( orderId.toString());
			const signer = await getNFTsigner()
			let blockNumber = await getL1BlockNumber();
			const deadline = (blockNumber + 60) ;
			const signature = await paymentSign({
				type:"payment", 
				orderId: orderId, 
				paymentTokenAddress: token.address, 
				amount: parseUnit(price, token.decimals),
				deadline: deadline,
				signer: signer
			})
			return res.status(200).send({message: "success", signature, deadline, orderId});
		}
		else {
			const balances = bidderInfo[0]?.balances;
			const tokenBalance = balances?.find((b) => {return b.symbol === acceptedToken})?.balance || 0;
			if(Number(tokenBalance) < Number(price)) return res.status(200).send({ message: "exceed balance"});
			await addUserInternalBalance([user], token.address, [-Number(price)]);

			bidders.push({
				bidder: user,
				price: price,
				acceptedToken: acceptedToken,
				quantity: 1,
				startTime: Now(),
				expiredTime: endTime,
				created: Now()
			})
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					bidders: bidders
				}
			);
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const cancelBid = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, _id, signature } = req.body;
		const creator = req.user?.address;
		const isMetamask = req.user?.isMetamask;
		if(isMetamask) {
			const recoverData = recoverPersonalData(`Do you want to cancel bid? \n Wallet address: ${creator}`, signature)
			if(recoverData !== creator) return res.status(200).json({message: "invalid signature"}); 
		}
		let orders = await NFTOrderBookController.find({
			nftCollection: collectionid,
			id: nftid
		}) as any
		const bidders: Bid[] = orders?.[0]?.bidders  || [] ;
		const bid = bidders.find((bd) => bd._id == _id);
		if(!bid) return res.status(200).json({message: "not exists bid"}); 
		if(bid.bidder.toUpperCase() !== creator.toUpperCase()) {
			return  res.status(200).send({ message: "not bidder" });
		}
		const tokens= await PaylableTokensController.find({});
		const tokenInfo = tokens.find(t => t.symbol === bid.acceptedToken);

		//refund bid money
		if(isMetamask) {
			const returnAmount = (Number(bid.price) -  (1  / tokenInfo.usd)).toFixed(3)
			await BalanceRequestController.create({
				email: "",
				from: "admin",
				to: bid.bidder,
				amount: returnAmount.toString(),
				type: "transfer",
				tokenAddress: toChecksumAddress(tokenInfo.address),
				tokenName: tokenInfo.name,
				created: Now(),
				tx: "",
				status: "pending"
			})
		} else {
			const tx = addUserInternalBalance([bid.bidder], tokenInfo.address, [bid.price]);
			if(!tx) return res.status(200).send({ message: "internal error" });
		}

		//delete bid from list
		const newBid = [] as Bid[];
		bidders.forEach(_b => {
			if(_b._id.toString() !== _id) newBid.push(_b)
		})
		await NFTOrderBookController.update(
			{
				nftCollection: collectionid,
				id: nftid
			}, 
			{
				bidders: newBid
			}
		)
		res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const offer = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid, price, acceptedToken, expiration } = req.body;
		const user = req.user?.address;
		const bidderInfo = await UserController.find({
			filter: {
				address: user
			}
		})
		const isMetamask = !bidderInfo || bidderInfo?.length === 0 || bidderInfo[0]?.metamask;
		const tokenInfo = await PaylableTokensController.find({
			symbol: acceptedToken
		});
		const token = tokenInfo[0];
		if(isMetamask) {
			let orderId = await ActionController.create({
				email: "",
				from: user, 
				to: Addresses.market, 
				amount: price.toString(), 
				paymentType: token.address,
				tokenName: acceptedToken,
				decimals: token.decimals || 18,
				actionName: "Buy Offer NFT payment",
				created: Now(),
				status: "pending",
				params: {
					collection: collectionid,
					nftid: nftid,
					price: Number(price),
					acceptedToken: acceptedToken,
					from: user,
					to: Addresses.market,
					expiration: expiration
				}
			});
			orderId = encodeByte32String( orderId.toString());
			const signer = await getNFTsigner()
			let blockNumber = await getL1BlockNumber();
			const deadline = (blockNumber + 60) ;
			const signature = await paymentSign({
				type:"payment", 
				orderId: orderId, 
				paymentTokenAddress: token.address, 
				amount: parseUnit(price, token.decimals),
				deadline: deadline,
				signer: signer
			})
			return res.status(200).send({message: "success", signature, deadline, orderId});
		}
		else {
			if (bidderInfo.length === 0) return res.status(200).send({ message: "not exists user" });
			const balances = bidderInfo[0]?.balances;
			const tokenBalance = balances?.find((b) => {return b.symbol === acceptedToken})?.balance || 0;
			if(Number(tokenBalance) < Number(price)) return res.status(200).send({ message: "exceed balance"});
			let orders = await NFTOrderBookController.find({
				nftCollection: collectionid,
				id: nftid
			}) as any
			await addUserInternalBalance([user], token.address, [-Number(price)]);
			const bidders = orders?.[0]?.bidders  || [];
			bidders.push({
				bidder: user,
				price: price,
				acceptedToken: acceptedToken,
				quantity: 1,
				startTime: Now(),
				expiredTime: expiration,
				created: Now()
			})
			await NFTOrderBookController.update(
				{
					nftCollection: collectionid,
					id: nftid
				}, 
				{
					bidders: bidders
				}
			);
			
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}



const paymentCancel = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, nftid } = req.body;
		const user = req.user?.address;
		const bidderInfo = await UserController.find({
			filter: {
				address: user
			}
		})
		const isMetamask = !bidderInfo || bidderInfo?.length === 0 || bidderInfo[0]?.metamask;
		if(isMetamask) {
			if (bidderInfo.length === 0) return res.status(200).send({ message: "not exists user" });
			await ActionController.remove({
				from: user, 
				'params.collection':  collectionid,
				"params.nftid": nftid
			});
		}
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

export default { list, listReset, withdraw, transfer, buyNow, offer, acceptBid, cancelSell, bid, cancelBid, paymentCancel}