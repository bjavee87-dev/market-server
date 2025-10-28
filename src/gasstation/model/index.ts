import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Request Schema
const RequestSchema = new Schema(
	{
		userAddress: {
			type: String,
		},
		amount: {
			type: String, // token amount
		},
		acceptedToken: {
			type: String, // token address
		},
		tokenDecimals: {
			type: Number
		},
		tokenSymbol: {
			type: String
		},
		price: {
			type: String,
		},
		currency: {
			type: String,
		},
		status: {
			type: String,
			default: "initiate", // initiate ,pending, onprocessing, success, failed, rejected
		},
		sessionId: {
			type: String,
		},
		isMetamask: {
			type: Boolean
		},
		tx: {
			type: String,
		},
	},
	{ timestamps: true }
);


const CreditCardSchema = new Schema(
	{
		address: {
			type: String,
		},
		customerid: {
			type: String,
		},
		paymentmethodid: {
			type: String,
		},
		last4: {
			type: String
		}
	},
	{ timestamps: true }
);


const CryptoTradeHistory = new Schema({
	date: Date,
	tradeVolumeUsd: Number,
	tradeVolumeJpy: Number,
	symbol: String,
	tradeVolumeSymbol: Number,
	feeSymbol: Number,
	feeJpy: Number
})

export const CryptoTrades = mongoose.model("cryptotrades", CryptoTradeHistory);

export const ExchangeRequests = mongoose.model("ExchangeRequests", RequestSchema);
export const CreditCard = mongoose.model("CreditCard", CreditCardSchema);
