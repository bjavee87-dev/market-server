import { Activities } from "../model";
import { Now } from "../../utils";


const create = async (data: Activity) => {
	const updateData = { ...data };
	updateData.nftCollection = data.nftCollection.toUpperCase();
	const newData = new Activities({
		...data,
		nftCollection: data.nftCollection.toUpperCase(),
		created: Now()
	})
	await newData.save();
	return true;
}
const findOne = async (filter: any) => {
	const newFilter = { ...filter };
	if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
	return await Activities.findOne(newFilter);
}
const find = async (filter: any) => {
	const newFilter = { ...filter };
	if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
	return await Activities.find(newFilter);
}
const update = async (filter: any, newData: any) => {
	const updateData = { ...newData };
	delete updateData.nftCollection;
	const newFilter = { ...filter };
	if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
	return await Activities.updateOne(
		newFilter,
		{ $set: updateData }
	);
}
const remove = async (filter: any) => {
	const newFilter = { ...filter };
	if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
	return await Activities.findOneAndDelete(newFilter);
}

export default {
	create,
	findOne,
	find,
	update,
	remove
}