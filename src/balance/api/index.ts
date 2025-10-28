import { Response, Request } from "express";
import { AlertController, UserController } from "../../user/controller";
import { PaylableTokensController } from "../../blockchain/controller";
import { BalanceHistoryController, BalanceRequestController } from "../controller";
import { toChecksumAddress } from "../../utils/blockchain";
import { Now, ellipsis } from "../../utils";
import setlog from "../../utils/setlog";
import { AdminSettingController } from "../../admin/controller/setting";

interface TransferRequest {
	email: string
	from: string
	to: string
	tokenAddress: string
	tokenName: string
	amount: number
}

const transfer = async (req: Request | any, res: Response) => {
	try {
		const { email, from, to, tokenAddress, tokenName, amount }: TransferRequest = req.body;
		let sender = await UserController.find({ filter: { address: from } }) as any;
		let recipient = await UserController.find({ filter: { address: to } }) as any;
		const isExternalSender = sender.length === 0 || !sender[0]?.privatekey || sender[0]?.isMetamask;
		const isExternalRecipient = recipient.length === 0 || !recipient[0].privatekey || recipient[0]?.isMetamask;
		if(isExternalSender) {
			//external -> external :  metamask -> metamask 
			//external -> internal :  metamask -> wallet (handle deposit)
			return res.status(200).send({ message: "external wallet" });
		}
		else {
			const senderBalance = sender[0]?.['balances'];
			const exchangeFee = Number((await AdminSettingController.getSetting()).exchangeFee || 1) / 100;
			let tokenBalance = 0;
			for (let i = 0; i < senderBalance?.length; i++) {
				if (senderBalance[i]?.address === tokenAddress) {
					tokenBalance = Number(senderBalance[i]?.balance || 0);
					break;
				}
			}
			if (tokenBalance < amount) return res.status(200).send({ message: "exceed balance" });
			//internal -> external
			if(isExternalRecipient) {
				let newBalance = [], flag = false;
				senderBalance?.forEach(element => {
					if (element?.address != tokenAddress) {
						newBalance.push(element)
					}
					else {
						newBalance.push({
							address: element?.address,
							name: element?.name,
							symbol: element?.symbol,
							decimals: element?.decimals,
							icon: element?.icon,
							balance: (Number(element?.balance || 0) - Number(amount) * (1 + exchangeFee) ).toString()
						})
						flag = true;
					}
				});
				if (!flag) {
					const tokenInfo = await PaylableTokensController.find({
						address: tokenAddress
					});
					const token = tokenInfo[0];
					if (token) {
						newBalance.push({
							address: token?.address,
							name: token?.name,
							symbol: token?.symbol,
							decimals: token?.decimals,
							icon: token?.icon,
							balance: (0 - Number(amount) * (1 + exchangeFee)).toString()
						})
					}
				}
				await UserController.update({
					filter: { address: from },
					update: { balances: newBalance }
				})
				await BalanceRequestController.create({
					email: email,
					from: from,
					to: to,
					amount: amount.toString(),
					type: "transfer",
					tokenAddress: toChecksumAddress(tokenAddress),
					tokenName: tokenName,
					created: Now(),
					tx: "",
					status: "pending"
				})
				await BalanceHistoryController.create({
					email: email,
					from: from,
					to: to,
					amount: amount.toString(),
					type: "transfer",
					tokenAddress: toChecksumAddress(tokenAddress),
					tokenName: tokenName,
					created: Now(),
					tx: "",
					status: "pending",
					read: false
				})
			} else {
				//internal -> internal
				recipient = recipient[0];
				const recipientBalance = recipient.balances || [];
				let newBalance = [];
				let flag = false;
				//plus to recipient
				recipientBalance?.forEach(element => {
					if (element?.address != tokenAddress) {
						newBalance.push(element)
					}
					else {
						newBalance.push({
							address: element?.address,
							name: element?.name,
							symbol: element?.symbol,
							decimals: element?.decimals,
							icon: element?.icon,
							balance: (Number(element?.balance) + Number(amount)).toString()
						})
						flag = true;
					}
				});
				if (!flag) {
					const tokenInfo = await PaylableTokensController.find({
						address: tokenAddress
					});
					const token = tokenInfo[0];
					if (token) {
						newBalance.push({
							address: token?.address,
							name: token?.name,
							symbol: token?.symbol,
							decimals: token?.decimals,
							icon: token?.icon,
							balance: Number(amount).toString()
						})
					}
				}
				await UserController.update({
					filter: { address: recipient?.address },
					update: { balances: newBalance }
				})

				//minus balance of sender
				newBalance = [], flag = false;
				senderBalance?.forEach(element => {
					if (element?.address != tokenAddress) {
						newBalance.push(element)
					}
					else {
						newBalance.push({
							address: element?.address,
							name: element?.name,
							symbol: element?.symbol,
							decimals: element?.decimals,
							icon: element?.icon,
							balance: (Number(element?.balance || 0) - Number(amount)).toString()
						})
						flag = true;
					}
				});
				const tokenInfo = await PaylableTokensController.find({
					address: tokenAddress
				});
				const token = tokenInfo[0];
				if (!flag) {
					if (token) {
						newBalance.push({
							address: token?.address,
							name: token?.name,
							symbol: token?.symbol,
							decimals: token?.decimals,
							icon: token?.icon,
							balance: (0 - Number(amount)).toString()
						})
					}
				}
				await UserController.update({
					filter: { address: from },
					update: { balances: newBalance }
				})
				await AlertController.create({
					type: "balance",
					email: sender.email,
					address: sender.address,
					from: "admin",
					title: "Transfered " + amount + token?.symbol,
					content: "Transfered to " + ellipsis(to, 15) + " " + amount + token?.symbol,
					created: Now(),
					status: "pending",
					deleted: false,
					collection: null,
					tokenId: null,
					img: "balance"
				})
				//add notification to recipient
				await AlertController.create({
					type: "balance",
					email: recipient.email,
					address: recipient.address,
					from: "admin",
					title: "Received " + amount + token?.symbol,
					content: "Received from " + ellipsis(from, 15) + " " + amount + token?.symbol,
					created: Now(),
					status: "pending",
					deleted: false,
					collection: null,
					tokenId: null,
					img: "balance"
				})
			}
			return res.status(200).send({ message: "success" });
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const withdraw = async (req: Request | any, res: Response) => {
	try {

	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

export default { withdraw, transfer}