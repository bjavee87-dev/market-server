import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserBalanceSchema = new Schema({
	address: String,
	name: String,
	symbol: String,
	balance: String,
	decimals: Number,
	icon: String,
	claiming: Boolean
})

const UserSchema = new Schema({
	name: {
		type: String,
		default: "",
	},
	email: {
		type: String,
		default: "",
	},
	phone: {
		type: String,
		default: "",
	},
	password: {
		type: String,
		default: '', 
	},
	address: {
		type: String,
		default: '',
	},
	privatekey: {
		type: String,
		default: '',
	},
	twitter: {
		type: String,
		default: '',
	},
	instagram: {
		type: String,
		default: '',
	},
	bio: {
		type: String,
		default: '',
	},
	link: {
		type: String,
		default: '',
	},
	avatar_img: {
		type: String,
		default: '',
	},
	banner_img: {
		type: String,
		default: '',
	},
	verified: {
		status: {
			type: String,
			default: ''
		},
		reason: {
			type: String,
			default: ''
		},
	},
	allow: {
		status: {
			type: Boolean,
			default: true
		},
		reason: {
			type: String,
			default: ''
		},
	},
	balances: [UserBalanceSchema],
	sign: String,
	lasttime: {
		type: Number,
		default: 0,
	},
	created: {
		type: Number,
		default: 0,
	},
	metamask: {
		type: Boolean,
		default: false
	},
	confirmedcode: {
		type: Boolean,
		default: false
	},
});


const ConfirmCodeSchema = new Schema({
	email: {
		type: String,
		default: "",
	},
	code: {
		type: Number,
		default: 0,
	},
	endtime: {
		type: Number,
		default: 0, 
	},
	type: {
		type: String,
		default: '',
	},
	verified: {
		type: Boolean,
		default: false
	}
});


const AlertSchema = new Schema({
	email: String,
	address: String,
	title: String,
	type: String,
	from: String,
	content: String,
	created: Number,
	status: String,
	deleted: Boolean,
	collectionid: String,
	tokenId: String,
	img: String
})

export const ConfirmCodes = mongoose.model("confirmcodes", ConfirmCodeSchema);
export const USER = mongoose.model("users", UserSchema);
export const Alert = mongoose.model("alerts", AlertSchema);
