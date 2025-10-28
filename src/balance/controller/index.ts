import { BalanceRequest, BalanceHistory } from "../models";
import { toChecksumAddress } from "../../utils/blockchain";

const BalanceRequestController = {
	create: async (data: BalanceRequestInterface) => {
		const newData = new BalanceRequest({
			...data,
			from: data.from.toUpperCase(),
			to: data.to.toUpperCase(),
			tokenAddress: toChecksumAddress(data.tokenAddress)
		})
		await newData.save();
		return true;
	},
	find: async (filter: any): Promise<BalanceRequestInterface[]> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase();
		if (newFilter.to) newFilter.to = filter.to.toUpperCase();
		return await BalanceRequest.find(newFilter);
	},
	findOne: async (filter: any): Promise<BalanceRequestInterface> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase();
		if (newFilter.to) newFilter.to = filter.to.toUpperCase();
		return await BalanceRequest.findOne(newFilter);
	},
	update: async (props: any) => {
		const { filter, update } = props;
		const result = await BalanceRequest.updateMany(
			filter,
			update
		);
		return result;
	},
	remove: async (filter: any) => {
		return await BalanceRequest.deleteMany(
			{ ...filter }
		);
	}
}

const BalanceHistoryController = {
	create: async (data: BalanceHistoryInterface) => {
		var oldData = await BalanceHistory.findOne({ from: data.from.toUpperCase(), type: data.type, tx: data.tx });
		if (!oldData) {
			const newData = new BalanceHistory({
					...data,
					from: data.from.toUpperCase(),
					to: data.to.toUpperCase()
				})
			await newData.save();
			return true;
		} else {
			await BalanceHistory.updateOne(
				{ from: data.from.toUpperCase(), tx: data.tx },
				{ $set: {
					...data,
					from: data.from.toUpperCase(),
					to: data.to.toUpperCase()
				}}
			);
			return false;
		}
	},
	find: async (filter: any): Promise<BalanceHistoryInterface[]> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase();
		if (newFilter.to) newFilter.to = filter.to.toUpperCase();
		return await BalanceHistory.find(newFilter);
	},
	findOne: async (filter: any): Promise<BalanceHistoryInterface> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase();
		if (newFilter.to) newFilter.to = filter.to.toUpperCase();
		return await BalanceHistory.findOne(newFilter);
	},
	update: async (filter: any, newData: any) => {
		const updateData = { ...newData };
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase();
		if (newFilter.to) newFilter.to = filter.to.toUpperCase();
		return await BalanceHistory.updateOne(
			newFilter,
			{
				$set: {
					...updateData
				}
			}
		);
	},
	remove: async (filter: any) => {
		return await BalanceHistory.findOneAndDelete(
			{ ...filter }
		);
	}
}


export {BalanceRequestController, BalanceHistoryController}