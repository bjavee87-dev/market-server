
import nodemailer from 'nodemailer';
import Config from '../../config.json'
import setlog from './setlog';

export const sendEmail = async (to: string, title: string, html: string, text: string) => {
	try {
		const transporter = nodemailer.createTransport({
			host: Config.Mail_Service,
			port: Config.Mail_Port,
			auth: {
				user: Config.Mail_User,
				pass: Config.Mail_Password
			},
		});
		await transporter.sendMail({
			from: Config.Mail_From,
			to: to,
			subject: title,
			text: text,
			html: html
		});
		return true;
	} catch (error) {
		setlog(error.message)
		return false;
	}
};

export const mailForRegister = (code: number, lang: string = "jp") => {
	if(lang === "jp") {
		return {
			title: `【めちゃイケNFT】新規登録の確認コードは${code}です。`,
			html: `
				<div>
					<p>あと少しで新規登録が完了します。</p>
					<br/>
					<p>めちゃイケNFTに確認コード入力画面が表示されたら、以下の確認コードを入力してください。</p>
					<h2>${code}</h2>
					<p>確認コードの有効期間は60秒です。 </p>
					<br/>
					<p>めちゃイケNFT</p>
				</div>
			`
		}
	}
	else {
		return {
			title: `[Mechaike NFT] The confirmation code for new registration is ${code}. `,
			html:`
			<div>
			<p>New registration will be completed soon. </p>
			<br/>
			<p>When the confirmation code input screen is displayed on Mechaike NFT, please enter the following confirmation code. </p>
			<h2>${code}</h2>
			<p>The verification code is valid for 60 seconds. </p>
			<br/>
			<p>Super cool NFT</p>
			</div>`
		}
	}
}

export const phoneForRegister = (code: number, lang: string = "jp") => {
	if(lang === "jp") {
		return `あなたのめちゃイケNFTの確認コードは${code}です`
	}
	else {
		return `Your Mechaike NFT verification code is ${code}`
	}
}

export const mailForChangeMail = (code: number, lang: string = "jp") => {
	if(lang === "jp") {
		return {
			title: `【めちゃイケNFT】メールアドレス変更の確認コードは${code}です。`,
			html: `
				<div>
					<p>あと少しでメールアドレスの変更が完了します。</p>
					<p>めちゃイケNFTに確認コード入力画面が表示されたら、以下の確認コードを入力してください。</p>
					<h2>${code}</h2>
					<br/>
					<p>確認コードの有効期間は60秒です。</p>
					<br/>
					<p>めちゃイケNFT</p>
				</div>
			`
		}
	}
	else {
		return {
			title: `[Mechaike NFT] The confirmation code for changing your email address is ${code}. `,
			html:`
				<div>
				<p>Your email address will be changed in a little while. </p>
				<p>When the confirmation code input screen is displayed on Mechaike NFT, please enter the following confirmation code. </p>
				<h2>${code}</h2>
				<br/>
				<p>The verification code is valid for 60 seconds. </p>
				<br/>
				<p>Super cool NFT</p>
				</div>
			`
		}
	}
}

export const mailForPassword = (code: number, lang: string = "jp") => {
	if(lang === "jp") {
		return {
			title: `【めちゃイケNFT】確認コードは${code}です。`,
			html: `
				<div>
					<p>あと少しでパスワードのリセットが完了します。</p>
					<p>めちゃイケNFTに確認コード入力画面が表示されたら以下の確認コードを入力してください</p>
					<h2>${code}</h2>
					<br/>
					<p>確認コードの有効期間は60秒です。</p>
					<br/>
					<p>めちゃイケNFT</p>
				</div>
			`
		}
	}
	else {
		return {
			title: `[Mechaike NFT] The confirmation code for changing your password is ${code}. `,
			html: `
				<div>
					<p>Your password will be reset in a few moments. </p>
					<p>When the confirmation code input screen is displayed on Mechaike NFT, please enter the following confirmation code</p>
					<h2>${code}</h2>
					<br/>
					<p>The verification code is valid for 60 seconds. </p>
					<br/>
					<p>Super cool NFT</p>
				</div>
			`
		}
	}
}