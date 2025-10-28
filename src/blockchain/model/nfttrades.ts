import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// activity data

const TradeHistroySchema = new Schema({
	date: Date,
	tradeVolumeUsd: Number,
	tradeVolumeJpy: Number,
	symbol: String,
	tradeVolumeSymbol: Number,
	feeSymbol: Number,
	feeJpy: Number
})

export const NftTrades = mongoose.model("nfttrades", TradeHistroySchema);