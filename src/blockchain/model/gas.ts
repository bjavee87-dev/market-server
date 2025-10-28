import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const GasSchema = new Schema({
	chainId: Number,
	gasPrice: String,
	collectionGas: String,
	lasttime: Number
})


export const Gas = mongoose.model("gas", GasSchema);