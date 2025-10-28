import mongoose from 'mongoose';
const Schema = mongoose.Schema;


// metadata data
const NFTMetadataSchema = new Schema({
	nftCollection: { type: String },
	id: { type: String },
	metaHash: { type: String },
	reacts: { type: [String] },
	views: { type: Number },
	favs: {
		type: Number,
		default: 0,
		index: true
	},
	name: { type: String },
	description: { type: String },
	image: { type: String },
	coverImage: { type: String },
	updatedBlockNum: Number,
	error: String,
	externalSite: String,
	attributes: {
		type: [{
			key: String,
			value: String
		}]
	}
});

// market data
const BidSchema = new Schema({
	bidder: { type: String },
	price: { type: Number },
	acceptedToken: { type: String },
	quantity: { type: Number },
	startTime: { type: Number },
	expiredTime: { type: Number },
	created: { type: Number }
});

const NFTMarketdataSchema = new Schema({
	nftCollection: { type: String },
	id: { type: String },
	acceptedToken: { type: String },
	saleType: { type: String },
	multiple: Boolean,
	price: { type: Number },
	owner: { type: String },
	expiredTime: { type: Number },
	updatedBlockNum: Number,
	isDigital: {
		type: Boolean,
		default: true
	},
	isCopyright: {
		type: Boolean,
		default: true
	},
	isRight: {
		type: Boolean,
		default: true
	}
});

const NFTOrderbookSchema = new Schema({
	nftCollection: { type: String },
	id: { type: String },
	orderId: { type: String },
	type: { type: String },
	acceptedToken: { type: String },
	price: { type: Number },
	owner: { type: String },
	startTime: { type: Number },
	endTime: { type: Number },
	created: { type: Number },
	bidders: [BidSchema],
	updatedBlockNum: Number,
});

// item data
const NFTItemDataSchema = new Schema({
	nftCollection: { type: String },
	id: { type: String },
	owner: { type: String },
	creator: { type: String },
	pick: Boolean,
	hide: { type: Boolean },
	onChain: Boolean
})


export const NFTItems = mongoose.model("nftitems", NFTItemDataSchema);
export const NFTMetaDatas = mongoose.model("nftmetadatas", NFTMetadataSchema);
export const NFTMarketDatas = mongoose.model("nftmarketdatas", NFTMarketdataSchema);
export const NFTOrderbooks = mongoose.model("nftorderbook", NFTOrderbookSchema);