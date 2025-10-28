import AdminController from '../controller'
import AdminWalletController from '../controller/wallet'
import { AdminSettingController } from '../controller/setting'
import Addresses from '../../blockchain/contracts/abi/addresses.json'
import { CryptPassword, Now } from '../../utils';
import Config from '../../../config.json'

const initData = async () => {
	console.log("Add default admin")
	await AdminController.create({
		email: Config.DefaultAdmin,
		password: await CryptPassword(Config.DefaultAdminPassword),
		root: true,
		created: Now(),
		allow: true
	});
	console.log("Add admin wallets")
	await AdminWalletController.create({
		type: 'nft',
		publickey: Config.NFT_WALLET,
		privatekey: Config.NFT_PRIVATEKEY
	})
	await AdminWalletController.create({
		type: 'treasury',
		publickey: Config.TREASURY_WALLET,
		privatekey: Config.TREASURY_PRIVATEKEY
	})
	await AdminWalletController.create({
		type: 'exchange',
		publickey: Config.EXCHANGE_WALLET,
		privatekey: Config.EXCHANGE_PRIVATEKEY
	})
	await AdminWalletController.create({
		type: 'adminTreasury',
		publickey: Config.ADMINTREASURY,
		privatekey: ''
	})
	await AdminWalletController.create({
		type: 'marketplace',
		publickey: Addresses.market,
		privatekey: ''
	})
	console.log("Set default fee")
	await AdminSettingController.createSetting({
		exchangeFee: Config.exchangeFee || 1,
		nftTradeFee: Config.nftTradeFee || 3
	});
}

export default { initData }