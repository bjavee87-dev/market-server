import { Currency } from "../model";

const CurrencyController = {
	create: async (data: CurrencyPrice) => {
		const updateData = { ...data };
		var oldData = await Currency.findOne({symbol: data.symbol})
		if (!oldData) {
			const newData = new Currency(updateData)
			await newData.save();
			return true;
		} else {
			await Currency.updateOne(
				{ symbol: data.symbol},
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.symbol) {
			updateFilter.symbol = filter?.symbol;
		}
		return await Currency.findOne(updateFilter);
	},
	find: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.symbol) {
			updateFilter.symbol = filter?.symbol;
		}
		return await Currency.find(updateFilter);
	},
	update: async (filter: any, newData: any) => {
		const updateFilter = { ...filter };
		if(filter?.symbol) {
			updateFilter.symbol = filter?.symbol;
		}
		return await Currency.updateOne(
			updateFilter,
			{ $set: newData }
		);
	},
	remove: async (filter: any) => {
		const updateFilter = { ...filter };
		if(filter?.symbol) {
			updateFilter.symbol = filter?.symbol;
		}
		return await Currency.findOneAndDelete(
			updateFilter
		);
	},
	getPrices: async(currency?: string) => {
		if(!currency) currency = "";
		const prices =  await Currency.find({
			$or: [
				{ 
					'symbol':  { "$regex": currency, "$options": "i" } 
				}
			] 
		});
		return prices;
	}
}

export default CurrencyController