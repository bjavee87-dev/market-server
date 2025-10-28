import {Actions} from "../model";
import { encodeByte32String } from "../../utils/blockchain";

interface paramsInterface {
	collection: string,
	nftid: string,
	price: number,
	acceptedToken: string,
	from: string,
	to: string,
	expiration?: number
}

interface ActionsInterface {
	email: string,
	from: string, 
	to: string, 
	amount: string, 
	paymentType: string,
	tokenName: string,
	decimals: number,
	actionName: string,
	created: number,
	status: string,
	params: paramsInterface,
	error?: string
}

export const ActionController = {
	create: async (data: ActionsInterface) => {
		let params = data?.params;
		if(params.nftid) {
			params['nftid'] = params.nftid.length  === 64 ?  encodeByte32String(params.nftid) : params.nftid;
		}
		const newData = new Actions({
			...data,
			from: data.from.toUpperCase(),
			to: data.to.toUpperCase(),
			params: params
		})
		await newData.save();
		return newData._id.toString();
	},
	find: async (filter: any): Promise<ActionsInterface[] | any> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase()
		if (newFilter.to) newFilter.to = filter.to.toUpperCase()
		return await Actions.find(newFilter);
	},
	findOne: async (filter: any): Promise<ActionsInterface> => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase()
		if (newFilter.to) newFilter.to = filter.to.toUpperCase()
		return await Actions.findOne(newFilter);
	},
	update: async (filter: any, newData: any) => {
		const updateData = { ...newData };
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase()
		if (newFilter.to) newFilter.to = filter.to.toUpperCase()
		return await Actions.updateOne(
			newFilter,
			{
				$set: {
					...updateData
				}
			}
		);
	},
	remove: async (filter: any) => {
		const newFilter = { ...filter };
		if (newFilter.from) newFilter.from = filter.from.toUpperCase()
		if (newFilter.to) newFilter.to = filter.to.toUpperCase()
		return await Actions.findOneAndDelete(
			newFilter
		);
	}
}

