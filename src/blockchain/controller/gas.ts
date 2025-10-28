import {Gas} from '../model'

const GasController = {
	create: async (data: GasInterface) => {
		var oldData = await Gas.findOne({ chainId: data.chainId})
		if (!oldData) {
			const newData = new Gas(data)
			await newData.save();
			return true;
		} else {
			await Gas.updateOne(
				{ chainId: data.chainId },
				{ $set: data}
			);
			return false;
		}
	},
	find: async (filter: any): Promise<GasInterface[]> => {
		const newFilter = { ...filter };
		return await Gas.find(newFilter);
	},
	findOne: async (filter: any): Promise<GasInterface> => {
		const newFilter = { ...filter };
		return await Gas.findOne(newFilter);
	},
	update: async (props: any) => {
		const { filter, update } = props;
		const result = await Gas.updateMany(filter, update);
		return result;
	},
	remove: async (filter: any) => {
		return await Gas.findOneAndDelete(filter);
	}
}

export default  GasController