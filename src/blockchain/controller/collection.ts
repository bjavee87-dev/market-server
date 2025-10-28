import { Collections, CollectionCacheData } from "../model";

export const CollectionsController = {
	create: async (data: Collection) => {
		var oldData = await Collections.findOne({ address: data.address })
		if (!oldData) {
			const newData = new Collections({
				...data,
				address: data.address.toUpperCase()
			})
			await newData.save();
			return true
		} else {
			const updateData = { ...data };
			delete updateData.address;
			await Collections.updateOne(
				{ nftCollection: data.address.toUpperCase() },
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any): Promise<Collection> => {
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await Collections.findOne(newFilter);
	},
	find: async (filter?: any, page?: number, limit?: number): Promise<Collection[] | any> => {
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		if (filter !== null) {
			if (page && limit) {
				return await Collections.find(newFilter).skip((page - 1) * limit).limit(limit * 1).exec();
			} else {
				return await Collections.find(newFilter);
			}
		} else {
			if (page && limit) {
				return await Collections.find().skip((page - 1) * limit).limit(limit * 1).exec();
			} else {
				return await Collections.find();
			}
		}
	},
	update: async (filter: any, newData: any) => {
		// don't update address
		const updateData = { ...newData };
		delete updateData.address;
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await Collections.updateOne(
			newFilter,
			{
				$set: {
					...updateData
				}
			}
		);
	},
	remove: async (filter: any) => {
		return await Collections.findOneAndDelete(
			{ ...filter }
		);
	}
}

export const CollectionCacheController = {
	create: async (data: CollectionCacheData) => {
		var oldData = await CollectionCacheData.findOne({ address: data.address.toUpperCase() })
		if (!oldData) {
			const newData = new CollectionCacheData({ ...data, address: data.address.toUpperCase() })
			await newData.save();
			return true;
		} else {
			const updateData = { ...data };
			delete updateData.address;
			await CollectionCacheData.updateOne(
				{ address: data.address.toUpperCase() },
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any): Promise<CollectionCacheData> => {
		const newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await CollectionCacheData.findOne(newFilter);
	},
	update: async (filter: any, newData: any) => {
		// don't update address
		const updateData = { ...newData };
		delete updateData.address;
		let newFilter = { ...filter };
		if (newFilter.address) newFilter.address = filter.address.toUpperCase()
		return await CollectionCacheData.updateOne(
			newFilter,
			{
				$set: updateData
			}
		);
	},
	remove: async (filter: any) => {
		return await CollectionCacheData.findOneAndDelete(
			filter
		);
	}
}