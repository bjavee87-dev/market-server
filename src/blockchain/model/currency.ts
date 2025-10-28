import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CurrencySchema = new Schema({
	symbol: String,
	price: Number
})


export const Currency = mongoose.model("Currency", CurrencySchema);