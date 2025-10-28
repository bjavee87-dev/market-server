import Stripe from "stripe";
import { Response, Request } from "express";
import { PaylableTokensController } from "../../blockchain/controller";
import {EXRequestController, CreditCardController} from "../controller";
import config from "../../../config.json";
import setlog from "../../utils/setlog";
import { toChecksumAddress } from "../../utils/blockchain";
import { AdminSettingController } from "../../admin/controller/setting";


const gasStation = {
	/**
	 * api/newRequest(req, res) : make new request
	 * req params
	 * @param {Number} buyAmount - eth amount
	 * @param {String} currency - JPY, USD, EUR
	 * @param {String} successUrl - redirect url when payment success
	 * @param {String} cancelUrl - redirect url when payment cancel
	 * return session
	 */
	newRequest: async (req: any, res: Response) => {
		try {
			const {
				buyAmount,
				acceptedToken,
				currency = "USD",
				email,
				customerId,
				paymentMethodId,
				// successUrl = "http://13.230.184.227",  //frontend server address
				// cancelUrl = "http://13.230.184.227",  //fronted server address
			} = req.body;

			const userAddress = req.user.address;
			const isMetamask = req.user.isMetamask;

			// get currency price
			const prices = await PaylableTokensController.getPrices(acceptedToken || "Ethereum");
			const decimals = prices[0]?.decimals || 18;
			const tokenAddress = prices[0]?.address;
			var price, currencyType;
			switch (currency) {
				 case "USD":
					price = prices[0]?.usd;
					currencyType = "usd";
					break;
				 case "EUR":
					price = prices[0]?.eur;
					currencyType = "eur";
					break;
				 default:
					price = prices[0]?.jpy;
					currencyType = "jpy";
					break;
			}

			const exchangeFee = ((await AdminSettingController.getSetting())?.exchangeFee || 1) / 100;

			// request data
			const amount = Number(buyAmount).toFixed(8);
			const fiatAmount = Number((Number(Number(buyAmount * price).toFixed(0)) * (1 + exchangeFee)).toFixed(0));

			// stripe session
			const stripe = new Stripe(config.STRIPEPRIVATEKEY, {
				apiVersion: "2022-11-15",
			});
			let customer;
			if(!customerId) {
				const customers = await stripe.customers.create({name: email});
				customer = customers.id; 
			}
			else {
				customer = customerId;
			}

			await stripe.paymentMethods.attach(paymentMethodId, {customer: customer})
			
			const info = await stripe.paymentMethods.retrieve(paymentMethodId);

			const paymentIntent = await stripe.paymentIntents.create({
				amount: fiatAmount,
				currency: currencyType,
				automatic_payment_methods: {enabled: true},
				payment_method: paymentMethodId,
				customer: customer
			});
			  	//save request data
			await EXRequestController.createRequest({
				userAddress: toChecksumAddress(req.user.address),
				amount: amount,
				price: price,
				currency: currencyType,
				sessionId: paymentIntent.id,
				acceptedToken: tokenAddress,
				tokenSymbol: acceptedToken,
				tokenDecimals: decimals,
				isMetamask: isMetamask, 
				tx: ''
			});

			await CreditCardController.create({
				address: req.user.address,
				customerid: customer,
				paymentmethodid: paymentMethodId,
				last4: info.card.last4
			})

			return res.status(200).send({client_secret: paymentIntent.client_secret, fiatAmount: fiatAmount, type: currencyType});

		} catch (error: any) {
			console.log("gasStation/newRequest", error.message);
			res.status(500).send({ error });
		}
	},
	/**
	 * api/complete payment(req,res) : complete payment webhook from stripe
	 * req params
	 * @param {Object} rawBody
	 * @param {String} tripe-signature
	 * return status
	 */
	completePayment: async (req: any, res: Response, buf: any) => {
		let event;
		try {
			console.log("start", req.headers["stripe-signature"]);
			const stripe = new Stripe(config.STRIPEPRIVATEKEY, {
				apiVersion: "2022-11-15",
			});
			event = stripe.webhooks.constructEvent(
				req.body,
				req.headers["stripe-signature"],
				// "whsec_005075b80305c4ef8933f614700d9cefda70e96f5711f53477320253bd17ee89"  //for local
				"whsec_ebeyENokXpPqKMOlAExRRfQpDkGjmlMi"  //for server
			);
			console.log("payment completed", event)
		} catch (error: any) {
			console.log(error)
			setlog("stripe.webhooks.constructEvent verify", error.message)
			return res.status(400).send(`Webhook Error: ${error.message}`);
		}

		if (event.type === "payment_intent.succeeded") {
			const session: any = event.data.object;
			try {
				await EXRequestController.updateRequest({
					filter: { sessionId: session.id },
					status: { status: "pending" },
				});
			} catch (error) {
				return res.status(404).send({ error, session });
			}
		}
		return res.status(200).send({ received: true });
	},
	/**
	 * set admin fee
	 * @param  {Number} newFee
	 */
	setAdminFee: async (req: Request, res: Response) => {
		const { newFee } = req.body;
		if (newFee && Number(newFee) > 0 && Number(newFee) < 100) {
			await AdminSettingController.updateSetting({ exchangeFee: newFee });
		}
	},
	/**
	 * get Exchange fee
	 * @return param  {Number} ExFee
	 */
	getFee: async (req: Request, res: Response) => {
		const ExFee = await AdminSettingController.getSetting();
		const currentFee = ExFee.exchangeFee;
		res.status(200).send(currentFee);
	},
	/**
	 * get all requests for user
	 * @return param  {[{userAddress,amount,price,currency,status,sessionId}]} requests
	 */
	getRequests: async (req: any, res: Response) => {
		const userAddress = req.user.address;
		if (!userAddress) return res.status(500).send({ error: "invalid auth" });
		const requests = await EXRequestController.findRequests({
			filter: {
				userAddress: userAddress,
			},
		});
		const resData = requests.filter((request: any) => {
			return request.status != "initiate";
		});
		res.status(200).send(resData);
	},
	getCacheCard: async (req: any, res: Response) => {
		const userAddress = req.user.address;
		const cards = await CreditCardController.find({address: userAddress});
		res.status(200).send({card: cards});
	}
};

export default gasStation;
