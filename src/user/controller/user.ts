import { USER } from "../model";

const create = async (data: UserDataObject) => {
	const newData = new USER(data);
	const saveData = await newData.save();
	if (!saveData) {
		throw new Error("Database Error");
	}
	return saveData;
}

const find = async (props: any) => {
	const { filter } = props;
	const result = await USER.find(filter);
	return result;
}

const update = async (props: any) => {
	const { filter, update } = props;
	const result = await USER.findOneAndUpdate(
		filter,
		update
	);
	return result;
}

const updateMany = async (props: any) => {
	const { filter, update } = props;
	const result = await USER.updateMany(
		filter,
		update
	);
	return result;
}

export default {
	create,
	find,
	update,
	updateMany
}