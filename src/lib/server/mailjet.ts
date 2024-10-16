import { MJ_APIKEY_PRIVATE, MJ_APIKEY_PUBLIC } from '$env/static/private';
import Mailjet from 'node-mailjet';

export const mailjet = new Mailjet(
	process.env.NODE_ENV === 'test'
		? {}
		: {
				apiKey: MJ_APIKEY_PUBLIC,
				apiSecret: MJ_APIKEY_PRIVATE
			}
);

export const noReplyEmail = 'no-reply@twiddly.dev';
