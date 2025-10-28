import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const PaylableTokenSchema = new Schema({
	name: String,
	symbol: String,
	decimals: Number,
	icon: String,
	address: String,
	coingeckoid: String,
	usd: {
		type: Number,
		default: 0
	},
	jpy: {
		type: Number,
		default: 0
	},
	eur: {
		type: Number,
		default: 0
	},
	internalLimit: {
		type: Number,
		default: 0
	},
	isNative: Boolean
})


export const PaylableTokens = mongoose.model("paylabletokens", PaylableTokenSchema);