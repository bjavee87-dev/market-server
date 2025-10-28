import { AdminWallet } from "../model";

const create = async (props: any) => {
	const { type, publickey, privatekey } = props;
	var oldData = await AdminWallet.findOne({ type: type})
	if (!oldData) {
		const newWallet = new AdminWallet({
			type: type,
            publickey: publickey,
            privatekey: privatekey
		});
		await newWallet.save();
		return true;
	} else {
		await AdminWallet.updateOne(
			{ type: type},
			{ $set: {
				publickey: publickey,
                privatekey: privatekey
			}}
		);
		return true;
	}
}

const findOne = async (props: any) => {
	const result = await AdminWallet.findOne(props);
	return result;
}

const findAll = async () => {
	const result = await AdminWallet.find();
	return result;
}

const update = async (filter, update) => {
	const result = await AdminWallet.updateMany(
		filter,
		update
	);
	return result;
}

const remove = async (filter: any) => {
	const result = await AdminWallet.findOneAndRemove(filter);
	return result;
}

export default {
	create, update, remove, findAll, findOne
}