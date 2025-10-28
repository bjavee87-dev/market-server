
import { PaylableTokensController } from "../../blockchain/controller";
import { UserController } from "../../user/controller";
import setlog from "../../utils/setlog";
import { ZeroAddress } from "../../utils/blockchain";
import { toChecksumAddress } from "../../utils/blockchain";

export const addUserInternalBalance = async (tos: string[], paymentType: string, amounts: string[] | number[]) => {
	for(let i = 0; i< tos.length; i++) {
		const to = tos[i] || ZeroAddress;
		const amount = Number(amounts[i]) || 0;
		const existsTo = await UserController.find({filter: {address: toChecksumAddress(to)}});
		if(existsTo.length > 0) {
			const recipient = existsTo[0];
			const recipientBalance = recipient.balances || [];
			let newBalance = [];
			let flag = false;
			recipientBalance?.forEach(element => {
				if (element?.address != paymentType && element?.symbol != paymentType) {
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
					address: paymentType
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
		}
	}
	return true;
}
