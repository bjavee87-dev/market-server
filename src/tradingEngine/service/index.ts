import { addUserInternalBalance } from "../../balance/api/service";
import { PaylableTokensController } from "../../blockchain/controller";
import { AlertController } from "../../user/controller";
import { Now } from "../../utils";
import setlog from "../../utils/setlog"
import { ZeroAddress, getImgFromTokenId, toChecksumAddress } from "../../utils/blockchain";

export const refundToBidders = async (bids: Bid[], collectionid: string, tokenid: string): Promise<boolean> => {
	try {
		const tokens = await PaylableTokensController.find({});
		// const price = await gasPrice()
		tokens.forEach(async (token) => {
			const tokenAddress = toChecksumAddress(token.address);
			const  tosInternal = [], amountsInternal = [];
			for(let i = 0; i<bids.length; i++) {
				const bid = bids[i];
				if(bid.acceptedToken.toUpperCase() === token.address.toUpperCase() || bid.acceptedToken.toUpperCase() === token.symbol.toUpperCase()) {
					tosInternal.push(toChecksumAddress(bid.bidder));
					if (tokenAddress === ZeroAddress) {
						amountsInternal.push(bid.price);
					}
					else {
						amountsInternal.push(bid.price);
					}
				}
			}
			//add royalty to internal balance
			await addUserInternalBalance(tosInternal, token.address, amountsInternal);
			const img = await getImgFromTokenId(collectionid, tokenid);
			tosInternal.forEach((wallet, index) => {
				AlertController.create({
					type: "nft",
					email: "",
					address: wallet,
					from: "",
					title: "Your bid request refunded",
					content:  "Your bid request refund"  + " (" + amountsInternal[index] + token.symbol +")",
					created: Now(),
					status: "pending",
					deleted: false,
					collection: collectionid,
					tokenId: tokenid,
					img: img?.replace("ipfs.babylonswap.finance", "ipfs.idealbridgex.com") || "alert"
				})
			});
		})
		return true;
	} catch (err) {
		console.log(err.message)
		setlog(err.message);
		return false;
	}
}