import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/* ----------- nftCollection schema ----------- */
const ExternalLinkSchema = new Schema({
	name: String,
	link: String
})

const CollectionMetadataSchema = new Schema({
	name: String,
	description: String,
	image: String,
	coverImage: String,
	links: [ExternalLinkSchema]
})

const NFTCollectionSchema = new Schema({
	address: String,
	owner: String,
	isLazyMint: Boolean,
	fee: Number,
	error: String,
	url: String,
	category: [Number],
	chainId: Number,
	created: Number,
	pick: Boolean,
	metadata: CollectionMetadataSchema,
	hide: {
		type: Boolean,
		default: false
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
})

const NFTCollectionDataSchema = new Schema({
	address: { type: String },
	items: {
		type: Number,
		index: true
	},
	floor: Number,
	volume: {
		type: Number,
		index: true
	},
	volumeJpy: Number,
	bestOffer: Number,
	listed: Number,
	owners: Number
})

export const Collections = mongoose.model("collections", NFTCollectionSchema);
export const CollectionCacheData = mongoose.model("collectiondatas", NFTCollectionDataSchema);