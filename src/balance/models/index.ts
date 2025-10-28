import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const BalanceRequestSchema = new Schema({
	email: String,
	from: String,
	to: String,
	type: String,
	tokenAddress: String,
	tokenName: String,
	amount: String,
	created: Number,
	tx: String,
	status: String
})

const BalanceHistorySchema = new Schema({
	email: String,
	from: String,
	to: String,
	type: String,
	tokenAddress: String,
	tokenName: String,
	amount: String,
	tx: String,
	created: Number,
	status: String,
	read: Boolean
})


export const BalanceRequest = mongoose.model("balancerequest", BalanceRequestSchema);
export const BalanceHistory = mongoose.model("balancehistory", BalanceHistorySchema);