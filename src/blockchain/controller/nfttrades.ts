import { NftTrades } from "../model";


const create = async (data) => {
	var oldData = await NftTrades.findOne({ date: data.date, symbol: data?.symbol })
	if (!oldData) {
		const newData = new NftTrades({
			...data
		})
		await newData.save();
		return true
	} else {
		await NftTrades.updateOne(
			{ date: data.date, symbol: data?.symbol},
			{ $set: 
				{
					tradeVolumeJpy: oldData?.tradeVolumeJpy + data?.tradeVolumeJpy,
					tradeVolumeUsd: oldData?.tradeVolumeUsd + data?.tradeVolumeUsd,
					tradeVolumeSymbol: oldData?.tradeVolumeSymbol + data?.tradeVolumeSymbol,
					feeSymbol: oldData?.feeSymbol + data?.feeSymbol,
					feeJpy: oldData?.feeJpy + data?.feeJpy
				}
			}
		);
		return false;
	}
}
const findOne = async (filter: any) => {
	const newFilter = { ...filter };
	return await NftTrades.findOne(newFilter);
}
const find = async (filter: any) => {
	const newFilter = { ...filter };
	return await NftTrades.find(newFilter);
}
const update = async (filter: any, newData: any) => {
	const updateData = { ...newData };
	const newFilter = { ...filter };
	return await NftTrades.updateOne(
		newFilter,
		{ $set: updateData }
	);
}
const remove = async (filter: any) => {
	const newFilter = { ...filter };
	return await NftTrades.findOneAndDelete(newFilter);
}

export default {
	create,
	findOne,
	find,
	update,
	remove
}