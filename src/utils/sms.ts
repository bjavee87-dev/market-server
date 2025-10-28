import twilio from 'twilio';
import config from '../../config.json'
import setlog from './setlog';

const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
const from = config.twilioFromNumber;

export const sendSMSMessage = async (to: string, message: string): Promise<boolean> => {
    try {
		if(!to.startsWith("+")) to = "+" + to;
        const result = await client.messages.create({
            from: from,
            to: to,
            body: message
        });
        if(result) {
            return true
        }
        return false;
    }
    catch(err) {
        setlog("sms message send error", "to: " + to + " msg: " + message);
        return false;
    }
}
