import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";
import { ZeroAddress, generateAddress, recoverPersonalData, toChecksumAddress } from "../../utils/blockchain";
import { UserController, AlertController, ConfirmcodeController } from '../controller'
import { CryptPassword, DecryptPassword, Now, randomCode, addToIpfs, toBigNum } from "../../utils";
import { mailForChangeMail, mailForPassword, mailForRegister, sendEmail } from "../../utils/mail";
import setlog from "../../utils/setlog";
import config from "../../../config.json";
import { getMarketplaceContractWithSigner, getTreasurysigner } from "../../blockchain/contracts";
import { parseUnit } from "../../utils/bigmath";
import { AdminSettingController } from "../../admin/controller/setting";


const signup = {
	register: async (req: Request, res: Response) => {
		try {
			const { name, email, password, phone, metamask, lang }: SignupRequest = req.body;
			if (!(email?.toString().trim() && password?.toString().trim())) return res.status(200).send({ message: "Please enter all required data." });
			const { privatekey, publickey } = generateAddress();
			const existsMail = await UserController.find({
				filter: { $or: [{ email: email }, { name: name }]}
			});
			if (existsMail.length > 0) {
				return res.status(200).send({ message: "Already exists same name or email or phone." });
			} else {
				const hash_password = await CryptPassword(password);
				await UserController.create({
					name: name,
					email: email,
					password: hash_password,
					phone: phone,
					address: publickey,
					privatekey: privatekey,
					twitter: "",
					instagram: "",
					link: "",
					bio: "",
					created: Now(),
					lasttime: Now(),
					avatar_img: "",
					banner_img: "",
					metamask: metamask,
					confirmedcode: false
				});
				const code1 = randomCode();
				const code2 = randomCode();
				const {title, html} = mailForRegister(code1, lang);
				// const text = phoneForRegister(code2)
				const sent1 = await sendEmail(email, title, html, '')
				const sent2 = true; // await sendSMSMessage(phone, text)
				if(!sent1) return res.status(200).send({ message: "could not send message to mail" });	
				if(!sent2) return res.status(200).send({ message: "phone error" });	

				if(sent1 && sent2) {
					await addConfirmCode(code1, email, 'register', false)
					await addConfirmCode(code2, phone, 'register', false)
				}
				else {
					return res.status(200).send({ message: "internal error" });		
				}
				return res.status(200).json({message: "success"});
			}
		} catch (err) {
			setlog("request", err);
			return res.status(200).send({ message: "internal error" });
		}
	},
	checkCode: async (req: Request, res: Response) => {
		try {
			const { email, smsCode, phoneCode } = req.body;
			const existsUser = await UserController.find({
				filter: { email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const phone = existsUser[0].phone;
				const publickey = existsUser[0].address;
				const name = existsUser[0].name;
				const existsCode = await ConfirmcodeController.find({
					filter: { email: email, type: "register"}
				});
				const existsPhoneCode = await ConfirmcodeController.find({
					filter: { email: phone, type: "register" }
				});
				if (existsCode.length === 0 || existsPhoneCode.length === 0) {
					return res.status(200).send({ message: "No exists code." });
				} else {
					const old_code_mail = existsCode[0]?.code || "";
					const endtime_mail = existsCode[0]?.endtime || "";
					// const old_code_phone = existsPhoneCode[0]?.code || "";
					// const endtime_phone = existsPhoneCode[0]?.endtime || "";
					if (Number(smsCode) !== Number(old_code_mail)) return res.status(200).send({ message: "No match mail code." });
					if (Number(endtime_mail) < Now()) return res.status(200).send({ message: "Endtime" });
					// if (Number(phoneCode) !== Number(old_code_phone)) return res.status(200).send({ message: "No match sms code." });
					// if (Number(endtime_phone) < Now()) return res.status(200).send({ message: "Endtime" });
					await ConfirmcodeController.update({
						filter: {email: email},
						update: {verified: true},
					});
					await ConfirmcodeController.update({
						filter: {email: phone},
						update: {verified: true},
					});
					await UserController.update({
						filter: {email: email},
						update: {confirmedcode: true}
					})
					var data = {
						email: email,
						address: publickey,
						name: name,
						avatar_img: "",
						metamask: false,
						balances: existsUser[0]?.balances
					};
					const token = jwt.sign(data, config.JWT_SECRET, {
						expiresIn: "144h",
					});
					return res.status(200).send({ message: "success", token: token});
				}
			}
		} catch (err) {
			res.status(200).send({ message: "internal error" });
		}
	},
	resendCode: async (req: Request, res: Response) => {
		try {
			const { email, lang }: CheckpasswordInterface = req.body;
			if (!email?.trim()) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: { email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				if(existsUser[0]?.confirmedcode) return res.status(200).send({ message: "already confirmed code" });
				let phone = existsUser[0]?.phone;
				const code1 = randomCode();
				const code2 = randomCode();
				const {title, html} = mailForRegister(code1, lang);
				// const text = phoneForRegister(code2)
				const sent1 = await sendEmail(email, title, html, '')
				const sent2 = true; //await sendSMSMessage(phone, text)
				if(!sent1) return res.status(200).send({ message: "could not send message to mail" });	
				if(!sent2) return res.status(200).send({ message: "phone error" });	
				if(sent1 && sent2) {
					await addConfirmCode(code1, email, 'register', false)
					await addConfirmCode(code2, phone, 'register', false)
				}
				else {
					return res.status(200).send({ message: "internal error" });		
				}
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	}
}

const checkMetamask = async (req: Request, res: Response) => {
	try {
		const { address } = req.body;
		const sellerInfo = await UserController.find({
			filter: {
				address: address
			}
		})
		const isSellerMetamask = !sellerInfo || sellerInfo?.length === 0 || sellerInfo[0]?.metamask;
		res.status(200).send(isSellerMetamask);
	} catch (err) {
		setlog("checkMetamask", err.message)
		res.status(200).send(false);
	}
}

const login = async (req: Request, res: Response) => {
	try {
		const { name, password, metamask, sign, address} = req.body;
		if(metamask && sign && address) {  //is metamask login
			const existsUser = await UserController.find({
				filter: { address: address}
			});
			
			if (existsUser.length === 0) {
				const recoverData = recoverPersonalData(`Welcome to MechaikeNFT! \n Click to sign in and accept the Terms of Service. \n This request will not trigger a blockchain transaction or cost any gas fees. \n Wallet address: ${address}`, sign)
				if(recoverData !== address) return res.status(200).json({message: "invalid signature"}); 
				await UserController.create({
					name: "",
					email: "",
					password: "",
					phone: "",
					address: address,
					privatekey: "",
					twitter: "",
					instagram: "",
					link: "",
					bio: "",
					created: Now(),
					lasttime: Now(),
					avatar_img: "",
					banner_img: "",
					sign: sign,
					metamask: true,
					confirmedcode: true
				});
				const data = {
					email: "",
					address: address,
					name: "Account",
					avatar_img: "",
					metamask: true,
					balances: []
				};;
				const token = jwt.sign(data, config.JWT_SECRET, {
					expiresIn: "144h",
				});
				return res.status(200).json({message: "success", token});
			} else {
				const data = {
					email: existsUser[0]?.email,
					address: existsUser[0]?.address,
					name: existsUser[0]?.name,
					avatar_img: existsUser[0]?.avatar_img,
					metamask: existsUser[0]?.metamask,
					balances: existsUser[0]?.balances
				};
				const token = jwt.sign(data, config.JWT_SECRET, {
					expiresIn: "144h",
				});
				await UserController.update({
					filter: { address: data.address },
					update: { lasttime: Now() }
				})
				return res.status(200).json({message: "success", token});
			}
		}
		else {  // is native account
			if (!(name?.trim() && password?.toString().trim())) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: { $or: [{ email: name }, { name: name }]}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const old_password = existsUser[0]?.password || "";
				const compare = await DecryptPassword(password, old_password);
				if (compare) {
					if(!existsUser[0]?.confirmedcode) {
						return res.status(200).json({ message: "check confirm code"});
					} else {
						const data = {
							email: existsUser[0]?.email,
							address: existsUser[0]?.address,
							name: existsUser[0]?.name,
							avatar_img: existsUser[0]?.avatar_img,
							metamask: false,
							balances: existsUser[0]?.balances
						};
						const token = jwt.sign(data, config.JWT_SECRET, {
							expiresIn: "144h",
						});
						await UserController.update({
							filter: { address: data.address },
							update: { lasttime: Now() }
						})
						return res.status(200).json({ message: "success", token});
					}
				} else {
					return res.status(200).send({ message: "No match password." });
				}
			}
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const changeProfile = async (req: Request, res: Response) => {
	try {
		const { name, address, link, bio } = req.body;
		if (!(name?.trim() && address?.toString().trim())) {
			return res.status(200).send({ message: "Please enter all required data." });
		}
		const existsUser = await UserController.find({
			filter: {address: address}
		});
		if (existsUser.length === 0) {
			return res.status(200).send({ message: "No exists user." });
		} else {
			await UserController.update({
				filter: { address: address },
				update: { name: name, link: link, bio: bio}
			});
			var data = {
				email: existsUser[0]?.email,
				address: address,
				name: name,
				avatar_img: existsUser[0]?.avatar_img,
				metamask: existsUser[0]?.metamask,
				balances: existsUser[0]?.balances
			};
			const token = jwt.sign(data, config.JWT_SECRET, {
				expiresIn: "144h",
			});
			res.status(200).json({
				message: "success",
				token,
			});
		}
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const changePassword = {
	checkPassword: async (req: Request | any, res: Response) => {
		try {
			const email = req.user.email;
			const { password, lang }: CheckpasswordInterface = req.body;
			if (!(password?.toString().trim())) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await UserController.find({
				filter: {email: email},
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const old_password = existsUser[0]?.password || "";
				const compare = await DecryptPassword(
					password,
					old_password
				);
				if (compare) {
					const code = randomCode();
					const {title, html} = mailForPassword(code, lang);
					const sent = await sendEmail(email, title, html, '')
					if(sent) {
						let row = await ConfirmcodeController.find({
							filter: {email: email}
						});
						if (row.length === 0) {
							await addConfirmCode(code, email, 'change-password', true)
						} else {
							await ConfirmcodeController.update({
								filter: {
									email: email,
								},
								update: {
									code: code,
									endtime: Now() + 60,
									type: "change-password",
									verified: true,
								},
							});
						}
						return res.status(200).send({ message: "success" });
					}
					else {
						return res.status(200).send({ message: "could not send message by mail" });
					}
				} else {
					return res.status(200).send({ message: "No match old password." });
				}
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	resendCode: async (req: Request, res: Response) => {
		try {
			const { email, lang }: CheckpasswordInterface = req.body;
			if (!email?.trim()) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await UserController.find({
				filter: {email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const code = randomCode();
				const {title, html} = mailForPassword(code, lang);
				const sent = await sendEmail(email, title, html, '')
				if(sent) {
					let row = await ConfirmcodeController.find({
						filter: {email: email}
					});
					if (row.length === 0) {
						await addConfirmCode(code, email, 'change-password', true)
					} else {
						await ConfirmcodeController.update({
							filter: {
								email: email,
							},
							update: {
								code: code,
								endtime: Now() + 60,
								type: "change-password",
								verified: true,
							},
						});
					}
				}
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	checkCode: async (req: Request, res: Response) => {
		try {
			const { email, code } = req.body;
			if (!(email?.trim() && code?.toString().length === 6)) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await ConfirmcodeController.find({
				filter: {
					email: email,
					type: "change-password",
				},
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists code." });
			} else {
				const old_code = existsUser[0]?.code || "";
				const endtime = existsUser[0]?.endtime || "";
				if (Number(code) !== Number(old_code)) return res.status(200).send({ message: "No match code." });
				if (Number(endtime) < Now()) return res.status(200).send({ message: "Endtime" });
				await ConfirmcodeController.update({
					filter: {email: email},
					update: {verified: true}
				});
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	resetPassword: async (req: Request, res: Response) => {
		try {
			const { email, password, code } = req.body;
			if (!(
					email?.trim() &&
					password?.toString().trim() &&
					code?.toString().length === 6
				)
			) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await UserController.find({
				filter: {
					email: email
				},
			});
			const existsCode = await ConfirmcodeController.find({
				filter: {
					email: email,
					type: "change-password"
				},
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				if (existsCode.length === 0) {
					return res.status(200).send({ message: "No exists code." });
				} else {
					if (Number(existsCode[0]?.code) !== Number(code)) return res.status(200).send({ message: "No match code" });
					if (!existsCode[0]?.verified) return res.status(200).send({ message: "Not verified code" });
					const hash_password = await CryptPassword(password);
					await UserController.update({
						filter: { email: email },
						update: { password: hash_password },
					});
					await ConfirmcodeController.update({
						filter: { email: email },
						update: {
							code: 0,
							endtime: 0,
							verified: true,
							type: "",
						},
					});
					return res.status(200).send({ message: "success" });
				}
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	}
}

const changeMail = {
	checkMail: async (req: Request | any, res: Response) => {
		try {
			const email = req?.user?.email;
			const {  newEmail, lang } = req.body;
			if (!email?.trim()) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: {email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const code = randomCode();
				const {title, html} = mailForChangeMail(code, lang);
				const sent = await sendEmail(newEmail, title, html, '')
				if(sent) {
					await addConfirmCode(code, newEmail, 'change-mail', false);
					return res.status(200).send({ message: "success" });
				}
				else {
					return res.status(200).send({ message: "could not send message to new email" });
				}
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	resendCode: async (req: Request | any, res: Response) => {
		try {
			const email = req?.user?.email;
			const {  newEmail, lang } = req.body;
			if (!email?.trim()) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: {email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const code = randomCode();
				const {title, html} = mailForChangeMail(code, lang);
				const sent = await sendEmail(newEmail, title, html, '')
				if(sent) {
					await addConfirmCode(code, newEmail, 'change-mail', false);
					return res.status(200).send({ message: "success" });
				}
				else {
					return res.status(200).send({ message: "could not send message to new email" });
				}
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	checkCode: async (req: Request | any, res: Response) => {
		try {
			const email = req?.user?.email;
			const {code, newEmail} = req.body;
			if (!(newEmail?.trim() && code?.toString().length === 6)) return res.status(200).send({ message: "Please enter all required data." });
			const existsCode = await ConfirmcodeController.find({
				filter: { email: newEmail, type: "change-mail"}
			});
			if (existsCode.length === 0) {
				return res.status(200).send({ message: "No exists code." });
			} else {
				const old_code = existsCode[0]?.code || "";
				const endtime = existsCode[0]?.endtime || "";
				if (Number(code) !== Number(old_code)) return res.status(200).send({ message: "No match code." });
				if (Number(endtime) < Now()) return res.status(200).send({ message: "Endtime" });
				await ConfirmcodeController.update({
					filter: { email: newEmail},
					update: { verified: true}
				});
				await UserController.update({
					filter: {
						email: email,
					},
					update: {
						email: newEmail
					}
				})
				const data = {
					email: newEmail,
					address: req?.user?.address,
					name: req?.user?.name,
					avatar_img: req?.user?.avatar_img,
					metamask: req?.user?.metamask,
					balances: req?.user?.balances
				};;
				const token = jwt.sign(data, config.JWT_SECRET, {
					expiresIn: "144h",
				});
				return res.status(200).json({message: "success", token, newEmail: newEmail});
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	}
}

const forgetPassword = {
	checkEmail: async (req: Request, res: Response) => {
		try {
			const { email, lang }: CheckpasswordInterface = req.body;
			if (!email?.trim()) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await UserController.find({
				filter: {email: email}
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const code = randomCode();
				const {title, html} = mailForPassword(code, lang);
				const sent = await sendEmail(email, title, html, '')
				if(sent) {
					let row = await ConfirmcodeController.find({
						filter: {email: email}
					});
					if (row.length === 0) {
						await addConfirmCode(code, email, 'forget-password', true)
					} else {
						await ConfirmcodeController.update({
							filter: { email: email},
							update: {
								code: code,
								endtime: Now() + 60,
								type: "forget-password",
								verified: true
							}
						});
					}
				}
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	resendCode: async (req: Request, res: Response) => {
		try {
			const { email, lang }: CheckpasswordInterface = req.body;
			if (!email?.trim()) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: { email: email }
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				const code = randomCode();
				const {title, html} = mailForPassword(code, lang);
				const sent = await sendEmail(email, title, html, '')
				if(sent) {
					let row = await ConfirmcodeController.find({ filter: {email: email}});
					if (row.length === 0) {
						await addConfirmCode(code, email, 'forget-password', true)
					} else {
						await ConfirmcodeController.update({
							filter: {
								email: email,
							},
							update: {
								code: code,
								endtime: Now() + 60,
								type: "forget-password",
								verified: true,
							},
						});
					}
				}
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	checkCode: async (req: Request, res: Response) => {
		try {
			const { email, code } = req.body;
			if (!(email?.trim() && code?.toString().length === 6)) {
				return res.status(200).send({ message: "Please enter all required data." });
			}
			const existsUser = await ConfirmcodeController.find({
				filter: { email: email, type: "forget-password" }
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists code." });
			} else {
				const old_code = existsUser[0]?.code || "";
				const endtime = existsUser[0]?.endtime || "";
				if (Number(code) !== Number(old_code)) return res.status(200).send({ message: "No match code." });
				if (Number(endtime) < Now()) return res.status(200).send({ message: "Endtime" });
				await ConfirmcodeController.update({
					filter: { email: email},
					update: { verified: true}
				});
				return res.status(200).send({ message: "success" });
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
	resetPassword: async (req: Request, res: Response) => {
		try {
			const { email, password, code } = req.body;
			if (!(email?.trim() && password?.toString().trim() && code?.toString().length === 6)) return res.status(200).send({ message: "Please enter all required data." });
			const existsUser = await UserController.find({
				filter: { email: email}
			});
			const existsCode = await ConfirmcodeController.find({
				filter: {
					email: email,
					type: "forget-password",
				},
			});
			if (existsUser.length === 0) {
				return res.status(200).send({ message: "No exists user." });
			} else {
				if (existsCode.length === 0) {
					return res.status(200).send({ message: "No exists code." });
				} else {
					if (Number(existsCode[0]?.code) !== Number(code)) return res.status(200).send({ message: "No match code" });
					if (!existsCode[0]?.verified) return res.status(200).send({ message: "Not verified code" });
					const hash_password = await CryptPassword(password);
					await UserController.update({
						filter: { email: email },
						update: { password: hash_password },
					});
					await ConfirmcodeController.update({
						filter: { email: email },
						update: {
							code: 0,
							endtime: 0,
							verified: true,
							type: "",
						},
					});
					return res.status(200).send({ message: "success" });
				}
			}
		} catch (err) {
			setlog("request", err);
			res.status(200).send({ message: "internal error" });
		}
	},
}

const addConfirmCode = async (code: number, email: string, type: string, verified: boolean = false ) => {
	await ConfirmcodeController.create({
		code: code,
		endtime: Now() + 60,
		email: email,
		type: type,
		verified: verified,
	});
}

const changeAvatar = async (req: Request | any, res: Response) => {
	try {
		const { address } = req.body;
		let resultHash = await addToIpfs(req.files.avatarImage?.data);
		var avatarImg = config.IPFS_BASEURL + resultHash;
		await UserController.update({
			filter: {
				address: address,
			},
			update: {
				avatar_img: avatarImg
			}
		});
		return res.status(200).send({ message: "success", result: avatarImg });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const changeBanner = async (req: Request | any, res: Response) => {
	try {
		const { address } = req.body;
		let resultHash = await addToIpfs(req.files.bannerImage?.data);
		var bannerImage = config.IPFS_BASEURL + resultHash;
		await UserController.update({
			filter: {
				address: address,
			},
			update: {
				banner_img: bannerImage
			}
		});
		return res.status(200).send({ message: "success", result: bannerImage });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const setUserBadge = async (req: Request, res: Response) => {
	try {
		const { email } = req.body;
		const user = await UserController.find({
			filter: {
				email: email
			},
		});
		if (user && user[0]?.verified.status === "pending") return res.status(200).send({ message: "already verified" });
		await UserController.update({
			filter: {
				email: email,
			},
			update: {
				verified: {
					status: "pending",
					reason: ""
				}
			}
		});
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const closeAlert = async (req: Request, res: Response) => {
	try {
		const { id, address } = req.body;
		await AlertController.update({
			filter: {
				$or: [{ address: address }, { email: address }],
				_id: id
			},
			update: {
				status: "read"
			}
		});
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const claimRoyalty = async (req: Request | any, res: Response) => {
	try {
		const address = req?.user?.address;
		const sign = req?.body?.sign;
		if(!address) return res.status(403).send({ message: "auth error" });
		const recoverData = recoverPersonalData(`Welcome to MechaikeNFT! \n Click to sign in and accept the Terms of Service. \n Could you claim royalty? \n Wallet address: ${address}`, sign)
		if(recoverData !== address) return res.status(200).json({message: "invalid signature"});
		const userInfo = await UserController.find({
			filter: {address: address}
		});
		const royalty = userInfo?.[0]?.balances;
		const royaltyClaiming = [];
		royalty.forEach(v => {
			royaltyClaiming.push({
				address: v.address,
				name: v.name,
				symbol: v.symbol,
				balance: v.balance,
				decimals: v.decimals,
				icon: v.icon,
				claiming: true
			})
		});
		await UserController.update({
			filter: {
				address: address
			},
			update: {
				balances: royaltyClaiming
			}
		})
		const signer = await getTreasurysigner()
		const marketCa = getMarketplaceContractWithSigner(signer);
		const exchangeFee = ((await AdminSettingController.getSetting())?.exchangeFee || 1) / 100;
		let claimed = [], newBalance = [];
		for(let i = 0; i< royalty.length; i++) {
			try {
				const token_balance = royalty[i];
				if(!token_balance.claiming) {
					let amount = token_balance?.balance || 0 as any;
					const tokenAddress = toChecksumAddress(token_balance.address);
					const returnAmount = Number(amount - (amount * exchangeFee));
					if(returnAmount < 0) continue;
					if(tokenAddress === ZeroAddress) {
						amount = toBigNum(returnAmount);
					}
					else {
						amount = parseUnit(returnAmount, token_balance.decimals);
					}
					if(token_balance.address === ZeroAddress) {
						const tx = await marketCa.multiSend([toChecksumAddress(address)], [amount]);
						await tx.wait();
					} else {
						const tx = await marketCa.multiSendToken(tokenAddress, [toChecksumAddress(address)], [amount]);
						await tx.wait();
					}
					claimed[i] = true;
				}
			} catch (err) {
				claimed[i] = false;
				console.log(err.message)
			}
		}
		claimed.forEach((element, index) => {
			if(!element) newBalance.push(royalty[index]);
		});
		await UserController.update({
			filter: {
				address: address
			},
			update: {
				balances: newBalance
			}
		})
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const closeAllAlert = async (req: Request, res: Response) => {
	try {
		const { address } = req.body;
		await AlertController.update({
			filter: {
				$or: [{ address: address }, { email: address }],
			},
			update: {
				status: "read"
			}
		});
		return res.status(200).send({ message: "success" });
	} catch (err) {
		setlog("request", err);
		res.status(200).send({ message: "internal error" });
	}
}

const middleware = (req: any, res: Response, next: NextFunction) => {
	try {
		const token = req.headers.authorization || "";
		jwt.verify(
			token,
			config.JWT_SECRET,
			async (err: any, userData: any) => {
				if (err) return res.sendStatus(403);
				const user = await UserController.find({
					filter: {
						address: userData.address,
						lasttime: { "$gt": (Now() - 86400) },
					},
				});
				if (user.length === 0) return res.sendStatus(403);
				req.user = {
					name: userData.name,
					email: userData.email,
					address: userData.address,
					isMetamask: userData.metamask
				};
				await UserController.update({
					filter: {
						email: userData.email,
						address: userData.address
					},
					update: {
						lasttime: Now()
					}
				});
				next();
			}
		);
	} catch (err: any) {
		if (err) return res.sendStatus(403);
	}
}

export default {
	middleware,
	closeAlert,
	closeAllAlert,
	setUserBadge,
	changeAvatar,
	changeBanner,
	changeProfile,
	login,
	checkMetamask,
	claimRoyalty,
	signup,
	changeMail,
	changePassword,
	forgetPassword,
};
