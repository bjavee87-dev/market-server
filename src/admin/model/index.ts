import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Admin Schema
const AdminSchema = new Schema({
	email: {
		type: String,
	},
	password: {
		type: String
	},
	root: {
		type: Boolean,
		default: false
	},
	allow: {
		type: Boolean,
		default: true
	},
	created: {
		type: Number,
		default: 0
	}
});

// Admin Schema
const AdminWalletSchema = new Schema({
	type: {
		type: String,
	},
	publickey: {
		type: String
	},
	privatekey: {
		type: String
	},
	alertLimit: [{
		address: String,
		balance: Number
	}]
});

const AdminSettingSchema = new Schema(
	{
		exchangeFee: Number,
		nftTradeFee: Number
	},
	{ timestamps: true }
);


export const AdminSettings = mongoose.model("AdminSettings", AdminSettingSchema);
export const AdminWallet = mongoose.model("adminwallet", AdminWalletSchema);
export const ADMIN = mongoose.model("admins", AdminSchema);