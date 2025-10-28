import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";
import AdminController from '../controller'
import AdminWalletController from '../controller/wallet'
import { AlertController, UserController } from "../../user/controller";
import { CollectionsController, NFTItemsController, PaylableTokensController } from "../../blockchain/controller";
import { toChecksumAddress } from "../../utils/blockchain";
import { CryptPassword, DecryptPassword, Now, addToIpfs } from "../../utils";
import config from "../../../config.json";
import setlog from "../../utils/setlog";

const Create = async (req: Request | any, res: Response) => {
	try {
		const { email, password } = req.body;
		if (!(email?.toString().trim() && password?.toString().trim())) {
			return res.status(200).send({ message: "Please enter all required data." });
		}
		let exists = await UserController.find({filter: { email: email }})
		if(exists?.length === 0) return res.status(200).send({ message: "Not exists user" });
		let check = await AdminController.findOne({filter: {email: email}});
		if (check) return res.status(200).send({ message: "Already exists same email" });

		let admins = await AdminController.findAll();
		if (!req?.admin?.root && admins.length > 0) return res.status(200).send({ message: "Not root admin" });
		const hash_password = await CryptPassword(password);
		const result = await AdminController.create({
			email: email,
			password: hash_password,
			root: admins.length === 0 ? true : false,
			created: Now(),
			allow: true
		});
		if (result) {
			await AlertController.create({
				type: "admin",
				email: email,
				address: "",
				from: "admin",
				title: "Assigned admin permission to you",
				content: "Assigned admin permission to you from admin",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: null,
				tokenId: null,
				img: "alert"
			})
			return res.status(200).json({
				message: "success"
			});
		}
		else return res.status(200).send({ message: "failed" });
	} catch (err: any) {
		console.log(err.message)
		setlog("admin create", err.message)
		res.status(500).end();
	}
}

const Login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;
		if (!(email?.trim() && password?.toString().trim())) {
			return res.status(200).send({ message: "Please enter all required data." });
		}
		const admin = await AdminController.findOne({
			filter: {
				$or: [{ email: email }],
			},
		});
		if (admin === null) {
			return res.status(200).send({ message: "No exists user." });
		} else {
			const old_password = admin.password || "";
			const compare = await DecryptPassword(password, old_password);
			if (compare) {
				if (!admin.allow) return res.status(200).send({ message: "Not allowed" });
				const data = jwt.sign({admin: admin.email, root: admin.root, allow: admin.allow}, config.JWT_SECRET, {
					expiresIn: "144h",
				});
				await UserController.update({
					filter: {
						email: admin.email
					},
					update: {
						lasttime: Now()
					}
				})
				return res.status(200).send({ message: "success", token: data });
			} else {
				return res.status(200).send({ message: "No match password." });
			}
		}
	} catch (err: any) {
		console.log(err);
		setlog("admin login", err.message)
		res.status(500).end();
	}
}

const RemoveAdmin = async (req: Request | any, res: Response) => {
	try {
		const { email } = req.body;
		if (!req?.admin.root) return res.status(200).send({ message: "Not root admin" });
		const result = await AdminController.remove({
			email: email
		});
		if (result) {
			await AlertController.create({
				type: "admin",
				email: email,
				address: "",
				from: "admin",
				title: "Deleted your admin permission ",
				content: "Deleted your admin permission from admin",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: null,
				tokenId: null,
				img: "alert"
			})
			return res.status(200).json({ message: "success" });
		}
	} catch (err: any) {
		console.log(err);
		setlog("remove admin", err.message)
		res.status(500).end();
	}
}

const changePassword = async (req: Request | any, res: Response) => {
	try {
		const { password } = req.body;
		const email = req.admin.email;
		if (!req?.admin.root) return res.status(200).send({ message: "Not root admin" });
		const hash_password = await CryptPassword(password);
		await AdminController.update({
			filter: { email: email },
			update: { password: hash_password },
		});
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("remove admin", err.message)
		res.status(500).end();
	}
}

const UpdateAdmin = async (req: Request | any, res: Response) => {
	try {
		const {email, password, root } = req.body;
		if (!req?.admin.root) return res.status(200).send({ message: "Not root admin" });
		if (!(email?.toString().trim() && password?.toString().trim())) {
			return res.status(200).send({ message: "Please enter all required data." });
		}
		let check = await AdminController.findOne({
			filter: {
				email: email,
			},
		});
		if (!check) return res.status(200).send({ message: "Not exists user" });
		const hash_password = await CryptPassword(password);
		const result = await AdminController.update({
			filter: {
				email: email
			},
			update: {
				password: hash_password,
				root: root
			}
		});
		if (result) {
			await AlertController.create({
				type: "admin",
				email: email,
				address: "",
				from: "admin",
				title: "Updated your admin permission ",
				content: "Updated your admin permission from admin",
				created: Now(),
				status: "pending",
				deleted: false,
				collection: null,
				tokenId: null,
				img: "alert"
			})
			return res.status(200).send({ message: "success" });
		} 
	} catch (err: any) {
		console.log(err.message);
		setlog("UpdateAdmin", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const GetUser = async (req: Request | any, res: Response) => {
	try {
		const { query } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		const users = await UserController.find({
			filter: {
				$or:
					[
						{
							'name': { "$regex": query, "$options": "i" }
						},
						{
							'name': { "$regex": query, "$options": "i" }
						}
					],
			}
		});
		return res.status(200).json({ message: "success", users });
	} catch (err: any) {
		console.log(err);
		setlog("admin get user", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateUserAllow = async (req: Request | any, res: Response) => {
	try {
		const { email, address, name, allow, reason } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await UserController.update({
			filter: { $or: [{ email: email }, { name: name }] },
			update: {
				allow: {
					status: allow,
					reason: reason
				}
			}
		});
		await AlertController.create({
			type: "user",
			email: email,
			address: address,
			from: "admin",
			title: allow  ? "Restored your account" : "Suspended your account",
			content: allow  ? "Restored your account from admin" : "Suspended your account from admin",
			created: Now(),
			status: "pending",
			deleted: false,
			collection: null,
			tokenId: null,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateUserAllow", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateUserBadge = async (req: Request | any, res: Response) => {
	try {
		const { email, address, name, badge, reason } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await UserController.update({
			filter: { address: address },
			update: {
				verified: {
					status: badge,
					reason: reason
				}
			}
		});
		await AlertController.create({
			type: "user",
			email: email,
			address: address,
			from: "admin",
			title: badge === "verified" ? "Verified your profile badge" : (badge === "rejected" ? "Rejected your profile badge" : "Deleted your profile badge"),
			content:  badge === "verified" ? "Verified your badge from admin" : (badge === "rejected" ? "Rejected your badge from admin" : "Deleted your badge from admin") ,
			created: Now(),
			status: "pending",
			deleted: false,
			collection: null,
			tokenId: null,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateUserBadge", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateCollectionHidden = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, owner, hide } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await CollectionsController.update(
			{ address: collectionid },
			{ hide: hide }
		);
		await AlertController.create({
			type: "collection",
			email: "",
			address: owner,
			from: "admin",
			title: (hide ? "Stoped " : "Restored ") + "your collection",
			content:  (hide ? "Stoped " : "Restored ") + "your collection from admin (collection: " + collectionid + ')',
			created: Now(),
			status: "pending",
			deleted: false,
			collection: collectionid,
			tokenId: null,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateCollectionHidden", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateCollectionBadge = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, owner, status, reason } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await CollectionsController.update(
			{ address: collectionid },
			{
				verified: {
					status: status,
					reason: reason
				}
			}
		);
		await AlertController.create({
			type: "collection",
			email: "",
			address: owner,
			from: "admin",
			title: status === "verified" ? "Verified your collection" : (status === "rejected" ? "Rejected collection badge" : "Deleted collection badge"),
			content: ( status === "verified" ? "Verified your collection from admin" : (status === "rejected" ? "Rejected your collection from admin" : "Deleted collection badge from admin") ) + " (Collection: " + collectionid + ")",
			created: Now(),
			status: "pending",
			deleted: false,
			collection: collectionid,
			tokenId: null,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateCollectionBadge", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateNftPick = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, owner, tokenid, pick } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await NFTItemsController.update({
			id: tokenid,
			nftCollection: collectionid
		}, {
			pick: pick
		});
		await AlertController.create({
			type: "nft",
			email: "",
			address: owner,
			from: "admin",
			title: (pick ? "Set pick " : "Reset pick ") + "your nft",
			content:  (pick ? "Set pick " : "Reset pick ") + "your nft from admin (collection: " + collectionid + ", nft: " + tokenid + ')',
			created: Now(),
			status: "pending",
			deleted: false,
			collection: collectionid,
			tokenId: tokenid,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateNftPick", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const UpdateNftHidden = async (req: Request | any, res: Response) => {
	try {
		const { collectionid, owner, tokenid, hide } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await NFTItemsController.update({
			id: tokenid,
			nftCollection: collectionid
		}, {
			hide: hide
		});
		await AlertController.create({
			type: "nft",
			email: "",
			address: owner,
			from: "admin",
			title: (hide ? "Stoped " : "Restored ") + "your NFT",
			content:  (hide ? "Stoped " : "Restored ") + "your NFT from admin (collection: " + collectionid + ", NFT: " + tokenid + ')',
			created: Now(),
			status: "pending",
			deleted: false,
			collection: collectionid,
			tokenId: tokenid,
			img: "alert"
		})
		return res.status(200).json({ message: "success" });
	} catch (err: any) {
		console.log(err);
		setlog("admin UpdateNftHidden", err.message)
		return res.status(200).json({ message: "internal error" });
	}
}

const addPaylableToken = async (req: Request | any, res: Response) => {
	try {
		const { name, symbol, decimals, coingecko, address } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		let resultHash = await addToIpfs(req.files.icon?.data);
		var icon = config.IPFS_BASEURL + resultHash;
		const existsToken = await PaylableTokensController.find({
			address: address
		});
		if(existsToken?.length > 0) return res.status(200).json({ message: "exists same token" });
		const newTokenData: PaylableToken = {
			address: toChecksumAddress(address),
			icon: icon,
			name: name,
			symbol: symbol,
			coingeckoid: coingecko,
			decimals: decimals,
			isNative: false,
			internalLimit: 10
		}
		await PaylableTokensController.create(newTokenData);
		return res.status(200).json({ message: "success", icon: icon });
	} catch (err) {
		console.log("addPaylableToken error", " ", err.message);
		setlog("addPaylableToken error", " ", err.message)
		if (err) return res.sendStatus(403);
	}
}

const removePaylableToken = async (req: Request | any, res: Response) => {
	try {
		const { address } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await PaylableTokensController.remove({
			address: address
		})
		return res.status(200).json({ message: "success" });
	} catch (err) {
		console.log("addPaylableToken error", " ", err.message);
		setlog("addPaylableToken error", " ", err.message)
		if (err) return res.sendStatus(403);
	}
}

const setUserWalletLimit = async (req: Request | any, res: Response) => {
	try {
		const { address, limit } = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		await PaylableTokensController.update({
			address: address
		}, {
			internalLimit: limit
		})
		return res.status(200).json({ message: "success" });
	} catch (err) {
		console.log("addPaylableToken error", " ", err.message);
		setlog("addPaylableToken error", " ", err.message)
		if (err) return res.sendStatus(403);
	}
}

const setAdminWalletAlert = async (req: Request | any, res: Response) => {
	try {
		const { alerts } : { alerts : Alert[]} = req.body;
		if (!req?.admin) return res.status(200).send({ message: "Not admin" });
		alerts.forEach(async element => {
			await AdminWalletController.update({
				type: element.type
			}, {
				alertLimit: element.alert
			})
		});
		return res.status(200).json({ message: "success" });
	} catch (err) {
		console.log("addPaylableToken error", " ", err.message);
		setlog("addPaylableToken error", " ", err.message)
		if (err) return res.sendStatus(403);
	}
}

const adminMiddleware = (req: any, res: Response, next: NextFunction) => {
	try {
		req.admin = "";
		const token = req.headers.authorization || "";
		jwt.verify(
			token,
			config.JWT_SECRET,
			async (err: any, adminData: any) => {
				if (err) return res.sendStatus(403);
				const user = await UserController.find({
					filter: {
						email: adminData.admin,
						lasttime: { "$gt": (Now() - 86400) },
					},
				});
				if (user.length === 0) return res.sendStatus(403);
				const admin = await AdminController.findOne({
					filter: {
						email: adminData.admin
					},
				});
				req.admin = admin;
				await UserController.update(
					{
						filter: {
							email: adminData.admin
						},
						update: {
							lasttime: Now()
						}
					}
				)
				next();
			}
		);
	} catch (err) {
		console.log("adminMiddleware error", " ", err.message);
		setlog("adminMiddleware error", " ", err.message)
		if (err) return res.sendStatus(403);
	}
}


export default {
	Create, 
	Login,
	RemoveAdmin, 
	UpdateAdmin,
	GetUser, 
	changePassword,
	UpdateUserAllow, 
	UpdateUserBadge,
	UpdateCollectionHidden,
	UpdateCollectionBadge,
	UpdateNftPick,
	UpdateNftHidden,
	addPaylableToken,
	removePaylableToken,
	setUserWalletLimit,
	setAdminWalletAlert,
	adminMiddleware
}