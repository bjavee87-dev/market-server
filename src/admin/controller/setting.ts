import { AdminSettings } from "../model";

const AdminSettingController = {
	updateSetting: async (props: any) => {
		const { newSetting } = props;
		const adminSettings = await AdminSettings.updateOne(
			{},
			{ $set: newSetting }
		);
		return adminSettings;
	},
	createSetting: async (props: any) => {
		const { exchangeFee, nftTradeFee } = props;
		var adminSettings = await AdminSettings.findOne();
		if (adminSettings) {
			return  await AdminSettings.updateOne(
				{},
				{ $set: { exchangeFee: exchangeFee, nftTradeFee: nftTradeFee} }
			);
		}
		adminSettings = new AdminSettings({ exchangeFee: exchangeFee, nftTradeFee: nftTradeFee});
		await adminSettings.save();
	},
	getSetting: async () => {
		return await AdminSettings.findOne();
	},
};

export  {
	AdminSettingController
}