import express from "express";
import UserAPI from "./user/api";
import AdminAPI from "./admin/api";
import balanceApi from "./balance/api";
import gasStation from "./gasstation/api";
import {blockchainAPI} from "./blockchain/api";
import { CollectionAPI, NftApi } from "./blockchain/api";
import TradingAPI from './tradingEngine/api'
import AdminSettingService from './admin/service'
import { BalanceRequestController } from "./balance/controller";
import { EXRequestController } from "./gasstation/controller";
import { UserController } from "./user/controller";

const Routes = async (router: express.Router) => {
	setTimeout(() => {
		// BalanceRequestController.remove({});
		// EXRequestController.removeAll();
		// UserController.updateMany({
		// 	filter: {},
		// 	update: {
		// 		balances: []
		// 	}
		// })
		AdminSettingService.initData();
		blockchainAPI.initData();
		blockchainAPI.initEventHandlers();
	}, 1000)

	//user
	router.post("/signup/register", UserAPI.signup.register);
	router.post("/signup/confirm-code", UserAPI.signup.checkCode);
	router.post("/signup/resend-code", UserAPI.signup.resendCode);
	router.post("/login", UserAPI.login);
	router.post("/change-password/check-password", UserAPI.middleware, UserAPI.changePassword.checkPassword);
	router.post("/change-password/check-code", UserAPI.middleware, UserAPI.changePassword.checkCode);
	router.post("/change-password/reset-password", UserAPI.middleware, UserAPI.changePassword.resetPassword);
	router.post("/change-password/resend-code", UserAPI.middleware, UserAPI.changePassword.resendCode);
	router.post("/change-mail/resend-code", UserAPI.middleware, UserAPI.changeMail.resendCode);
	router.post("/change-mail/check-mail", UserAPI.middleware, UserAPI.changeMail.checkMail);
	router.post("/change-mail/check-code", UserAPI.middleware, UserAPI.changeMail.checkCode);
	router.post("/forget-password/check-email", UserAPI.forgetPassword.checkEmail);
	router.post("/forget-password/check-code", UserAPI.forgetPassword.checkCode);
	router.post("/forget-password/reset-password", UserAPI.forgetPassword.resetPassword);
	router.post("/forget-password/resend-code", UserAPI.forgetPassword.resendCode);
	router.post("/change-profile", UserAPI.middleware, UserAPI.changeProfile);
	router.post("/profile/change-banner", UserAPI.middleware, UserAPI.changeBanner);
	router.post("/profile/change-avatar", UserAPI.middleware, UserAPI.changeAvatar);
	router.post("/profile/verify-user", UserAPI.middleware, UserAPI.setUserBadge);
	router.post("/alert/close", UserAPI.middleware, UserAPI.closeAlert);
	router.post("/alert/closeAll", UserAPI.middleware, UserAPI.closeAllAlert);
	router.post("/check-metamask", UserAPI.checkMetamask);
	router.post("/claim-royalty", UserAPI.middleware, UserAPI.claimRoyalty);

	//admin
	router.post("/admin/create", AdminAPI.adminMiddleware, AdminAPI.Create);
	router.post("/admin/login", AdminAPI.Login);
	router.post("/admin/delete-admin", AdminAPI.adminMiddleware, AdminAPI.RemoveAdmin);
	router.post("/admin/edit-admin", AdminAPI.adminMiddleware, AdminAPI.UpdateAdmin);
	router.post("/admin/set-user-allow", AdminAPI.adminMiddleware, AdminAPI.UpdateUserAllow);
	router.post("/admin/set-user-badge", AdminAPI.adminMiddleware, AdminAPI.UpdateUserBadge);
	router.post("/admin/set-collection-allow", AdminAPI.adminMiddleware, AdminAPI.UpdateCollectionHidden);
	router.post("/admin/set-collection-badge", AdminAPI.adminMiddleware, AdminAPI.UpdateCollectionBadge);
	router.post("/admin/set-nft-pick", AdminAPI.adminMiddleware, AdminAPI.UpdateNftPick);
	router.post("/admin/set-nft-allow", AdminAPI.adminMiddleware, AdminAPI.UpdateNftHidden);
	router.post("/admin/token-create", AdminAPI.adminMiddleware, AdminAPI.addPaylableToken);
	router.post("/admin/token-remove", AdminAPI.adminMiddleware, AdminAPI.removePaylableToken);
	router.post("/admin/change-password", AdminAPI.adminMiddleware, AdminAPI.changePassword);
	router.post("/admin/set-userwallet-limit", AdminAPI.adminMiddleware, AdminAPI.setUserWalletLimit);
	router.post("/admin/set-adminwallet-alert", AdminAPI.adminMiddleware, AdminAPI.setAdminWalletAlert);
	
	
	// collection
	router.post("/collection/create", UserAPI.middleware, CollectionAPI.create);
	router.post("/collection/set-badge", UserAPI.middleware, CollectionAPI.setBadge);
	router.post("/collection/update-info", UserAPI.middleware, CollectionAPI.update);
	router.post("/collection/import", UserAPI.middleware, CollectionAPI.importCollection);
	router.post("/collection/upload-image", UserAPI.middleware, CollectionAPI.uploadCollectionImage);

	//nft
	router.post("/nft/create", UserAPI.middleware, NftApi.create);
	router.post("/nft/favorite", UserAPI.middleware, NftApi.favorite);

	//trading
	router.post("/nft/list", UserAPI.middleware, TradingAPI.list);
	router.post("/nft/list-reset", UserAPI.middleware, TradingAPI.listReset);
	router.post("/nft/cancel-list", UserAPI.middleware, TradingAPI.cancelSell);
	router.post("/nft/transfer", UserAPI.middleware, TradingAPI.transfer);
	router.post("/nft/export", UserAPI.middleware, TradingAPI.withdraw);
	router.post("/nft/make-offer", UserAPI.middleware, TradingAPI.offer);
	router.post("/nft/bid", UserAPI.middleware, TradingAPI.bid);
	router.post("/nft/cancel-bid", UserAPI.middleware, TradingAPI.cancelBid);
	router.post("/nft/buy", UserAPI.middleware, TradingAPI.buyNow);
	router.post("/nft/accept-bid", UserAPI.middleware, TradingAPI.acceptBid);
	router.post("/nft/setView", NftApi.setView);
	router.post("/nft/get-export-fee", NftApi.getExportFee);
	router.post("/nft/cancel-payment", UserAPI.middleware, TradingAPI.paymentCancel);

	//balance
	router.post("/balance/withdraw", UserAPI.middleware, balanceApi.withdraw);
	router.post("/balance/transfer", UserAPI.middleware, balanceApi.transfer);

	// // credit card
	// router.post("/payment/session-initiate", UserAPI.middleware, gasStation.newRequest);
	// router.post("/payment/get-cache-card", UserAPI.middleware, gasStation.getCacheCard);
};

export { Routes,  gasStation };