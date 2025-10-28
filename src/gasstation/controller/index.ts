import { ExchangeRequests, CreditCard } from "../model";
import CryptoTradeController from './cryptotades'

const EXRequestController = {
	// create new request
	createRequest: async (props: any) => {
		const { userAddress, amount, price, currency, sessionId, tokenDecimals, acceptedToken, tokenSymbol, isMetamask, tx } = props;
		const newRequest = new ExchangeRequests({
			userAddress,
			amount,
			tokenDecimals,
			acceptedToken,
			tokenSymbol,
			price,
			currency,
			sessionId,
			isMetamask,
			tx
		});
		await newRequest.save();
	},
	// update request status: onProcessing, success, failed, rejected
	updateRequest: async (props: any) => {
		const { filter, status } = props;
		const request = await ExchangeRequests.updateOne(filter, {
			$set: status,
		});
		return request;
	},
	removeRequest: async (props: any) => {
		const { filter } = props;
		await ExchangeRequests.deleteOne(filter);
	},
	removeAll: async () => {
		await ExchangeRequests.deleteMany({});
	},
	findRequests: async (props: any) => {
		const { filter } = props;
		const requests = await ExchangeRequests.find(filter);
		return requests;
	},
	findRequest: async (props: any) => {
		const { filter } = props;
		const request = await ExchangeRequests.findOne(filter);
		return request;
	},
};

export const CreditCardController = {
	create: async (data: CreditCard) => {
		var oldData = await CreditCard.findOne({ address: data.address.toUpperCase() })
		if (!oldData) {
			const newData = new CreditCard({
				...data,
				address: data.address.toUpperCase()
			})
			await newData.save();
			return true
		} else {
			const updateData = { ...data };
			delete updateData.address;
			await CreditCard.updateOne(
				{ nftCollection: data.address.toUpperCase()},
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any): Promise<CreditCard> => {
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await CreditCard.findOne(newFilter);
	},
	find: async (filter?: any, page?: number, limit?: number): Promise<CreditCard[] | any> => {
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		if(filter !== null) {
			if(page && limit) {
				return await CreditCard.find(newFilter).skip((page - 1) * limit).limit(limit * 1).exec();	
			}
			else {
				return await CreditCard.find(newFilter);
			}
		} else {
			if(page && limit) {
				return await CreditCard.find().skip((page - 1) * limit).limit(limit * 1).exec();	   
			} else {
				return await CreditCard.find();
			}
		}
	},
	update: async (filter: any, newData: any) => {
		// don't update address
		const updateData = { ...newData };
		delete updateData.address;
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await CreditCard.updateOne(
			newFilter,
			{
				$set: {
					...updateData
				}
			}
		);
	},
	remove: async (filter: any) => {
		return await CreditCard.findOneAndDelete(
			{ ...filter }
		);
	}
}

export { EXRequestController, CryptoTradeController};
