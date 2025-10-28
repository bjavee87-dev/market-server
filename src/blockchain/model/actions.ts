import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ActionsSchema = new Schema({
	email: String,
	from: String, 
	to: String, 
	amount: String, 
	paymentType: String,
	tokenName: String,
	decimals: Number,
	actionName: String,
	created: Number,
	status: String,
	params: Object,
	error: String
})

export const Actions = mongoose.model("nftactions", ActionsSchema);