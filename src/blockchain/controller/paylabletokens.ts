import { PaylableTokens } from "../model";

const PaylableTokensController = {
	create: async (data: PaylableToken) => {
		const updateData = { ...data };
		var oldData = await PaylableTokens.findOne({name: data.name})
		if (!oldData) {
			const newData = new PaylableTokens({
				...data
			})
			await newData.save();
			return true;
		} else {
			await PaylableTokens.updateOne(
				{ name: data.name},
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.address) {
			updateFilter.address = filter?.address;
		}
		return await PaylableTokens.findOne(updateFilter);
	},
	find: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.address) {
			updateFilter.address = filter?.address;
		}
		return await PaylableTokens.find(updateFilter);
	},
	update: async (filter: any, newData: any) => {
		const updateFilter = { ...filter };
		if(filter?.address) {
			updateFilter.address = filter?.address;
		}
		return await PaylableTokens.updateOne(
			updateFilter,
			{ $set: newData }
		);
	},
	remove: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.address) {
			updateFilter.address = filter?.address;
		}
		return await PaylableTokens.findOneAndDelete(
			updateFilter
		);
	},
	getPrices: async(token?: string) => {
		if(!token) token = "";
		const prices =  await PaylableTokens.find({
			$or: [
				{ 
					'name':  { "$regex": token, "$options": "i" } 	
				}, 
				{ 
					'symbol':  { "$regex": token, "$options": "i" } 
				}
			] 
		});
		return prices;
	}
}

export default PaylableTokensController