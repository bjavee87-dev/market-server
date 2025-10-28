import { resolvers } from "./resolver";

const typeDefs = `#graphql
	scalar Date

	type Link {
		name: String
		link: String
	}

	type CollectionMetadata {
		name: String,
		description: String,
		image: String,
		coverImage: String,
		links: [Link]
	}

	type Collection {
		address: String
		owner: String
		isLazyMint: Boolean,
		fee: Float,
		pick: Boolean,
		error: String
		url: String
		category: [Float],
		chainId: Float,
		hide: Boolean
		metadata: CollectionMetadata
		created: Float
		verified: verified
		items: Float
		owners: Float
		volume: Float
		volumeJpy: Float
		floor: Float
		bestoffer: Float
	}

	type verified {
		status: String
		reason: String
	}
	type allow {
		status: Boolean
		reason: String
	}

	type balance {
		address: String
		name: String
		symbol: String
		balance: String
		decimals: Float
		icon: String
	}
	type User {
		address: String
		name: String
		bio: String
		email: String
		phone: String
		twitter: String
		instagram: String
		link: String
		avatar_img: String
		banner_img: String
		verified: verified
		allow: allow
		balances: [balance]
		lasttime: Float
		created: Float
		confirmedcode: Boolean
		metamask: Boolean
	}

	type Alert {
		_id: String
		title: String
		from: String
		content: String
		created: Float
		status: String
		type: String
		collectionid: String
		tokenId: String
		img: String
	}
	   
	type Prices {
		address: String
		name: String
		symbol: String
		decimals: Float
		icon: String
		usd: Float
		jpy: Float
		eur: Float
	}
	   
	type Attribute {
		value: String
		key: String
	}

	type NFTItem {
		nftCollection: String
		id: String
		owner: String  
	}

	type NFTMetaData {
		nftCollection: String
		id: String
		metaHash: String
		reacts: [String]
		views: Float
		favs: Float
		name: String
		description: String
		image: String
		coverImage: String
		externalSite:String
		attributes: [Attribute]
		updatedBlockNum: Float
		error: String
	}

	type Bid {
		bidder: String
		price: Float
		acceptedToken: String
		quantity: Float
		startTime: Float
		expiredTime: Float
		created: Float
		_id: String
	}

	type NFTData{
		_id: String
		nftCollection: String
		tokenid: String
		reacts: [String]
		views: Float
		favs: Float
		name: String
		description: String
		image: String
		coverImage: String
		saleType: String
		multiple: Boolean
		externalSite:String
		attributes: [Attribute]
		updatedBlockNum: Float
		error: String
		owner: String
		creator: String
		acceptedToken: String
		price: Float
		expiredTime: Float
		startTime: Float
		endTime: Float
		bidders: [Bid]
		hide: Boolean
		pick: Boolean
		isDigital: Boolean
		isCopyright: Boolean
		isRight: Boolean
		collectionname: String
		collectionverified: String
	}

	type PaylableToken {
		name: String
		symbol: String
		decimals: Float
		icon: String
		address: String
		usd: Float
		jpy: Float
		eur: Float
		isNative: Boolean
		internalLimit: Float
	}

	type Category {
		key: String
		jp: String
		en: String
	}

	type FavoritedNFT {
		collectionid: String
		nftid: String
		userEmail: String
		userAddress: String
	}

	type Admin {
		email: String
		root: Boolean
		allow: Boolean
		created: Float
	}

	type ActivityParam {
		type: String
		value: String
	}

	type Activity {
		nftCollection: String
		tokenid: String
		type: String
		created: Float
		params: [ActivityParam]
	}

	type Search {
		collection: [Collection]
		item: [NFTData]
		user: [User]
	}

	type wallets {
		nft: String
		treasury: String
		marketplace: String
		exchange: String
	}

	type alert {
		address: String
		balance: Float
	}

	type adminBalanceAlert {
		nft: [alert]
		treasury: [alert]
		collection: [alert]
		exchange: [alert]
		marketplace: [alert]
	}

	type Wallet {
		addresses: wallets
		alerts: adminBalanceAlert
	}
	type UserWalletLimit {
		balance: Float
	}

	type Fee {
		exchangeFee: Float
		tradeFee: Float
	}

	type TradeInfo {
		today: Float
		yesterday: Float
		week: Float
		week2: Float
		total: Float
		total2: Float
	}

	type ChartData {
		_id: String
		tradeVolumeJpy: Float
	}

	type TradeChart {
		data: [ChartData]
	}

	type TradeInfo {
		tradeVolumeJpy: Float
		tradeVolumeSymbol: Float
		feeSymbol: Float
		feeJpy: Float
		symbol: String
	}

	type TradeInfoBySymbol {
		nft: [TradeInfo]
		crypto: [TradeInfo]
	}

	type TopCreator {
		address: String
		name: String
		email: String
		phone: String
		banner_img: String
		avatar_img: String
		verified: String
		items: Float
		volume: Float
		volumeJpy: Float
	}

	type Query {
		getAdmins(token: String): [Admin]
		getUsersInfo(username: String, address: String, token: String, badge: String): [User]
		getUserBalance(address: String): [balance]
		getCategory: [Category]
		getCollectionInfo(address: String, owner:String, badge: String, name: String, acceptedToken: String, page: Float, limit: Float, sort: String, category: String): [Collection]
		getPrice(token: String): [Prices]
		getAlert(address: String): [Alert]
		getPaylableToken: [PaylableToken]
		getFavoritedNFT(collection: String, nft: String, userAddress: String): [FavoritedNFT]
		getFavoriteNFT(owner: String): [NFTData]
		getNFTs(nftcollection: String, owner: String, creator: String, query: String, page: Float, limit: Float, sort: String, tokenid: String, price1: Float, price2: Float, searchsymbol: String, salestatus: String, symbols: String): [NFTData]
		getNFTActivity(nftcollection: String, nftid: String, type: String): [Activity]
		getTopCreator: [TopCreator]
		getTopSellNFT: [NFTData]
		getMainNFTs: [NFTData]
		getPopularCollection(days: Float): [Collection]
		getSearch(keyword: String): Search
		getAdminWallet: Wallet
		getUserWalletLimit: UserWalletLimit
		getFee: Fee
		getAdminTradeBase(token: String): TradeInfo
		getTradeChart(token: String): TradeChart
		getCryptoChart(token: String): TradeChart
		getTradeSymbol(token: String): TradeInfoBySymbol
	}
`;

export { resolvers, typeDefs };

// getAdmins(token: String): [Admin]
// getUsersInfo(username: String, address: String, token: String, badge: String): [User]
// getUserBalance(address: String): [balance]
// getCategory: [Category]
// getCollectionInfo(address: String, owner:String, badge: String, name: String, acceptedToken: String, page: Float, limit: Float, sort: String, category: String): [Collection]
// getPrice(token: String): [Prices]
// getAlert(address: String): [Alert]
// getPaylableToken: [PaylableToken]
// getFavoritedNFT(collection: String, nft: String, userAddress: String): [FavoritedNFT]
// getFavoriteNFT(owner: String): [NFTData]
// getNFTs(nftcollection: String, owner: String, creator: String, query: String, page: Float, limit: Float, sort: String, tokenid: String, price1: Float, price2: Float, searchsymbol: String, salestatus: String, symbols: String): [NFTData]
// getNFTActivity(nftcollection: String, nftid: String, type: String): [Activity]
// getTopCreator: [TopCreator]
// getTopSellNFT: [NFTData]
// getMainNFTs: [NFTData]
// getPopularCollection(days: Float): [Collection]
// getSearch(keyword: String): Search
// getAdminWallet: Wallet
// getUserWalletLimit: UserWalletLimit
// getFee: Fee
// getAdminTradeBase(token: String): TradeInfo
// getTradeChart(token: String): TradeChart
// getCryptoChart(token: String): TradeChart
// getTradeSymbol(token: String): TradeInfoBySymbol