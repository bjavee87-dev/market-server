interface Collection {
    address: string
    owner: string
    isLazyMint: boolean
    fee: number
    error: string
    url?: string
    category?: number[]
    pick?: boolean
    metadata: {
        name: string
        description: string
        image: string
        coverImage: string
        links: {
            name: string
            link: string
        }[]
    }
    created?: number
    address: string
    items: number
    owners: number
    volume: number
    volumeJpy: number
    floor: number
    bestoffer: number
}


interface CollectionCacheData {
    address: string
    items: number
    owners: number
    volume: number
    volumeJpy: number
    floor: number
    bestoffer: number
}

interface NFTSearch {
    query: String
    nftcollection: String
    tokenid: String
    sort: String
    price1: Number
    price2: Number
    owner: String
    creator: String
    searchsymbol: String
    salestatus: String
    page: Number
    limit: Number
    symbols: String
}

interface Attribute {
    key: string
    value: string
}

interface NFTItem {
    nftCollection: string
    id: string
    owner: string
    creator: string
	pick: boolean
	hide: boolean
	onChain: boolean
}

interface NFTMetaData {
    nftCollection: string
    id: string
    metaHash: string
    reacts?: (string)[]
    views?: number
    favs?: number
    name: string
    description: string
    image: string
    coverImage: string
    externalSite?: string
    attributes: Attribute[]
    updatedBlockNum?: Number
    error?: string
    network: string
}

interface Bid {
	bidder: string
	price: number
	acceptedToken: string
	quantity?: number
	startTime?: number
	expiredTime: number
	created?: Number
	_id?: string
}

interface NFTMarketData {
    nftCollection: string
    id: string
    acceptedToken: string
    price: number
    owner: string
    saleType: string
    multiple: boolean
    expiredTime: number
    updatedBlockNum?: number
    isDigital?: boolean
    isCopyright?: boolean
    isRight?: boolean
}

interface NFTOrderbook {
    nftCollection: string,
    id: string,
    type: string,
    acceptedToken: string,
    price: number,
    owner: string,
    bidders?: Bid[]
    startTime?: number,
    endTime?: number,
    created: number,
    updatedBlockNum: number,
}

interface Activity {
    nftCollection: string
    tokenid: string
    type: string
    params: any[]
    check?: boolean
    txHash?: string
    created?: number
}


interface CurrencyPrice {
    symbol: string
    price: number
}

interface CreditCard {
    address: string
    customerid: string
    paymentmethodid: string
    last4: string
}

interface PaylableToken {
    name: string
    symbol: string
    decimals: string
    icon: string
    address: string
    coingeckoid: string
    usd?: number
    eur?: number
    jpy?: number
    isNative?: boolean
    internalLimit?: number
}

interface Category {
    key: string
    jp: string
    en: string
}

// user system types
declare interface SignupRequest {
    name: string
    email: string
    phone: string
    password: string
    metamask?: boolean
    sign?: string
    lang?: string
}

declare interface Balance {
    address: string
    name: string
    symbol: string
    balance: string
    decimals: number
    icon: string
    claiming?: boolean
}

declare interface UserDataObject {
    name: string
    email: string
    phone: string
    password: string
    address: string
    privatekey: string
    bio: string
    twitter: string
    instagram: string
    link: string
    avatar_img: string
    banner_img: string
    created: number
    lasttime: number
    verified?: {
        status: string
        reason: string
    }
    allow?: {
        status: boolean
        reason: string
    }
    balances?: [Balance]
    metamask?: Boolean
    sign?: string
    confirmedcode?: Boolean
}

declare interface ChangemailRequest {
    old_mail: string
    new_mail: string
}

declare interface ChangepasswordInterface {
    email: string
    old_password: string
    new_password: string
}

declare interface ConfirmcodeObject {
    email: string
    code: number
    endtime: number
    type: string
    verified: boolean
}

declare interface CheckpasswordInterface {
    email: string
    password: string
    lang?: string
}

declare interface BalanceRequestInterface {
    email: string
    from: string
    to: string
    type: string
    tokenAddress: string
    tokenName: string
    amount: string
    created?: number
    tx?: string
    status?: string
}

declare interface GasInterface {
    chainId: number
    gasPrice: string
    collectionGas: string
    lasttime?: number
}

declare interface BalanceHistoryInterface {
    email: string
    from: string
    to: string
    type: string
    tokenAddress: string
    tokenName: string
    amount: string
    tx: string
    created: number
    status: string
    read: boolean
}


declare interface TransactionResult {
	hash: 			string
    blockHash:		string
    blockNumber: 	string
    from:			string
    gas:			string
    gasPrice: 		string
    input:			string
    nonce:			string
    r:				string
    s:				string
    to:				string
    transactionIndex:string
    v:				string
    value:			string
}


declare interface Alert {
    type: string
    alert: {
        address: string
        balance: number
    }[]
}