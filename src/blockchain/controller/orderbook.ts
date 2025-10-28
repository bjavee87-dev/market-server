import {NFTOrderbooks} from "../model"
import { encodeByte32String } from "../../utils/blockchain";

const NFTOrderBookController = {
	create: async (data: NFTOrderbook) => {
		const updateData = { ...data };
		updateData.nftCollection = data.nftCollection.toUpperCase();
		updateData.id = updateData.id.length  === 64 ?  encodeByte32String(updateData.id) : updateData.id
		var oldData = await NFTOrderbooks.findOne({ nftCollection: updateData.nftCollection.toUpperCase(), id: updateData.id})
		if (!oldData) {
			const newData = new NFTOrderbooks(updateData)
			await newData.save();
			return true;
		} else {
			await NFTOrderbooks.updateOne(
				{ nftCollection: data.nftCollection.toUpperCase(), id: data.id},
				{ $set: data }
			);
			return false;
		}
	},
	findOne: async (filter: any): Promise<NFTOrderbook> => {
		const newFilter = { ...filter };
		if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
		return await NFTOrderbooks.findOne(newFilter);
	},
	find: async (filter: any) => {
		const newFilter = { ...filter };
		if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
		return await NFTOrderbooks.find(newFilter);
	},
	update: async (filter: any, newData: any) => {
		const newFilter = { ...filter };
		if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
		const updateData = { ...newData };
		delete updateData.nftCollection;
		return await NFTOrderbooks.updateOne(
			newFilter,
			{ $set: updateData }
		);
	},
	remove: async (filter: any) => {
		const newFilter = { ...filter };
		if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
		return await NFTOrderbooks.findOneAndDelete(
			newFilter
		);
	}
}

export default NFTOrderBookController