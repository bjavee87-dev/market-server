import { ADMIN } from "../model";

const create = async (props: any) => {
	const { name, email, password, allow, root, created } = props;
	var oldData = await ADMIN.findOne({ email: email})
	if (!oldData) {
		const newAdmin = new ADMIN({
			name: name,
			email: email,
			password: password,
			allow: allow,
			root: root,
			created: created
		});
		await newAdmin.save();
		return true;
	} else {
		await ADMIN.updateOne(
			{ email: email},
			{ $set: {
				password: password,
				allow: allow,
				root: root
			}}
		);
		return true;
	}
}

const findOne = async (props: any) => {
	const { filter } = props;
	const result = await ADMIN.findOne(filter);
	return result;
}

const findAll = async () => {
	const result = await ADMIN.find();
	return result;
}

const update = async (props: any) => {
	const { filter, update } = props;
	const result = await ADMIN.updateMany(
		filter,
		update
	);
	return result;
}

const remove = async (filter: any) => {
	const result = await ADMIN.findOneAndRemove(filter);
	return result;
}

export default {
	create, update, remove, findAll, findOne
}