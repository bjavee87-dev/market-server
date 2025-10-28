import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// activity data

const ActivitySchema = new Schema({
	nftCollection: String,
	tokenid: String,
	type: String,
	params: Array,
	check: Boolean,
	txHash: String,
	created: {
		type: Number,
		index: true
	}
})

export const Activities = mongoose.model("nfthistories", ActivitySchema);