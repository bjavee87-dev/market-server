import { ConfirmCodes } from "../model";

const create = async (data: ConfirmcodeObject) => {
	var oldData = await ConfirmCodes.findOne({ email: data.email})
	if (!oldData) {
		const newData = new ConfirmCodes(data);
		const saveData = await newData.save();
		if (!saveData) {
			throw new Error("Database Error");
		}
		return true;
	} else {
		await ConfirmCodes.updateOne(
			{ email: data.email},
			{ $set: {...data}}
		);
		return true;
	}
}

const find = async (props: any) => {
	const { filter } = props;
	const result = await ConfirmCodes.find(filter);
	return result;
}

const update = async (props: any) => {
	const { filter, update } = props;
	const result = await ConfirmCodes.findOneAndUpdate(
		filter,
		update
	);
	return result;
}

const writeCode = async( props: any) => {
	const { filter, update } = props;
	const result = await ConfirmCodes.findOneAndUpdate(
		filter,
		update,
		{
			new: true,
			upsert: true
		}	
	);
	return result;
}

export default {
	create,
	find,
	update,
	writeCode
}