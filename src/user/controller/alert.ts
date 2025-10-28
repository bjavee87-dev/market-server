import { Alert } from "../model";

const create = async (props: any) => {
	const { email, address, from, title, content, created, type, status, deleted, collection, tokenId, img } = props;
		const newAlert = new Alert({
			type: type,
			email: email,
			address: address,
			from: from,
			title: title,
			content: content,
			created: created, 
			status: status,
			deleted: deleted,
			collectionid: collection,
			tokenId: tokenId,
			img: img
		});
	let adminData = await newAlert.save();
	return adminData;
}

const find = async (props: any) => {
	const { filter } = props;
	const result = await Alert.find(filter);
	return result;
}

const getAll = async () => {
	const result = await Alert.find();
	return result;
}

const update = async (props: any) => {
	const { filter, update } = props;
	const result = await Alert.updateMany(
		filter,
		update
	);
	return result;
}
const remove = async (filter: any) => {
	const result = await Alert.findOneAndRemove(filter);
	return result;
}

export default {
	create, 
	update,
	remove,
	getAll,
	find
}