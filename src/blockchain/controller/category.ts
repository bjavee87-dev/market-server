import { Category } from "../model";

const CategoryController = {
	create: async (data: Category) => {
		const updateData = { ...data };
		var oldData = await Category.findOne({key: data.key})
		if (!oldData) {
			const newData = new Category({
				...data
			})
			await newData.save();
			return true;
		} else {
			await Category.updateOne(
				{ key: data.key},
				{ $set: updateData }
			);
			return false;
		}
	},
	findOne: async (filter: any) => {
		return await Category.findOne(filter);
	},
	find: async (filter: any) => {
		return await Category.find(filter);
	},
	update: async (filter: any, newData: any) => {
		return await Category.updateOne(
			filter,
			{ $set: newData }
		);
	},
	remove: async (filter: any) => {
		return await Category.findOneAndDelete(
			filter
		);
	}
}

export default CategoryController