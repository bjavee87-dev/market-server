import Jimp from "jimp";
import axios from "axios";
import bcrypt from 'bcrypt'
import { ethers } from "ethers";
import { create } from "ipfs-http-client";
import config from "../../config.json";
import { handleEvent, sign } from "./blockchain";
import setlog from "./setlog";

const ipfsClient = create({
	host: config.IPFS_HOST,
	port: config.IPFS_PORT,
	protocol: config.IPFS_OPT,
});

/**
 * set delay for delayTimes
 * @param {Number} delayTimes - timePeriod for delay
 */
export const delay = (delayTimes: number) => {
	return new Promise((resolve: any) => {
		setTimeout(() => {
			resolve(2);
		}, delayTimes);
	});
};

/**
 * change data type from Number to BigNum
 * @param {Number} value - data that need to be change
 * @param {Number} d - decimals
 */
export const toBigNum = (value: number | string, d = 18) => {
	return ethers.utils.parseUnits(String(value), d);
};

/**
 * change data type from BigNum to Number
 * @param {Number} value - data that need to be change
 * @param {Number} d - decimals
 */
export const fromBigNum = (value: number | string, d = 18) => {
	return ethers.utils.formatUnits(value, d);
};

/**
 * change data array to no duplicate
 */
export const getNoDoubleArray = (value: [string | number]) => {
	let newArray = [];
	for (let i = 0; i < value.length; i++) {
		if (newArray.indexOf(value[i]) === -1) {
			newArray.push(value[i]);
		}
	}
	return newArray;
};

export const hex = (arrayBuffer: Buffer) => {
	return Array.from(new Uint8Array(arrayBuffer))
		.map(n => n.toString(16).padStart(2, "0"))
		.join("");
}

export const CryptPassword = async (password: string) => {
	return await bcrypt.hash(password, 10);
};

// decrypt password
export const DecryptPassword = async (
	password: string,
	savedPassword: string
) => {
	return await bcrypt.compare(password, savedPassword);
};

export const Now = () => Math.round(new Date().getTime() / 1000);

export const randomCode = () => {
	var minm = 100000;
	var maxm = 999999;
	return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
}


function getValidHttpUrl(data: string) {
	let url;
	try {
		url = new URL(data);
	} catch (_) {
		// const cid = new CID(data);
		// ipfs hash : Qm...
		return config.IPFS_BASEURL + data;
	}

	if (url.protocol === "http:" || url.protocol === "https:") return data;
	if (url.protocol === "ipfs:") {
		return config.IPFS_BASEURL + url.hostname + url.pathname;
	}
	throw new Error("invalid");
}

const resizeFile = (imgURL: string) => {
	return new Promise((resolve, reject) => {
		Jimp.read(imgURL, function (err: any, img: any) {
			if (err) return reject(err);
			try {
				const supportedTypes = ["jpeg", 'png', "bmp"];
				let fileType = img.getExtension()
				if (!supportedTypes.includes(fileType)) return reject("unsupported type")
				img.resize(256, 256).getBase64(Jimp.AUTO, function (e: any, img64: any) {
					if (e) reject(e);
					resolve(img64)
				});
			} catch (err) {
				reject(err);
			}
		});
	});
}

const addToIpfs = (data: any, type: any = null) => {
	let bufferfile = type ? Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64') : Buffer.from(data);
	return new Promise(async (resolve, reject) => {
		try {
			let file = await ipfsClient.add(bufferfile);
			if (file === undefined) {
				return reject('ipfs error');
			}
			resolve(String(file.cid));
		} catch (err) {
			reject(err);
		}
	});
}

export const callRpc = async (rpc, params?: any) => {
	for (let i = 0; i < 100; i++) {
		const response = await axios.post(rpc, params, { headers: { 'Content-Type': 'application/json' } })
		if (response && response.data) {
			return response.data
		} else {
			setlog("callRpc failed")
		}
	}
	return null
}


export const ellipsis = (address: string, start: number = 6) => {
	if (!address || address === null) return ''
	const len = (start) + 7;
	return address.length > len ? `${address?.slice(0, start)}...${address?.slice(-4)}` : address
}

// External Utils
export { handleEvent, sign, getValidHttpUrl, resizeFile, addToIpfs };
