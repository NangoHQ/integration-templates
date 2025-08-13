import { createAction } from 'nango';
import { ZohoMailSendEmailOutput, ZohoMailSendEmailInput } from '../models.js';

const action = createAction({
    description: 'An action to send an email in zoho mail',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/zoho-mail/send-email'
    },

    input: ZohoMailSendEmailInput,
    output: ZohoMailSendEmailOutput,
    scopes: ['ZohoMail.messages.CREATE'],

    exec: async (nango, input): Promise<ZohoMailSendEmailOutput> => {
        //we need to enforce accountId to be of type string since accountId contains bigint values 6984040000000000000
        if (!input.accountId || typeof input.accountId !== 'string') {
            throw new nango.ActionError({
                message: 'accountId is a required parameter and needs to be of a non-empty string'
            });
        } else if (!input.fromAddress || typeof input.accountId !== 'string') {
            throw new nango.ActionError({
                message: 'fromAddress is a required body field and must be of a non-empty string'
            });
        } else if (!input.toAddress || typeof input.accountId !== 'string') {
            throw new nango.ActionError({
                message: 'toAddress is a required body field and must be of a non-empty string'
            });
        }

        const endpoint = `/api/accounts/${input.accountId}/messages`;

        const postData = {
            fromAddress: input.fromAddress,
            toAddress: input.toAddress,
            ccAddress: input.ccAddress,
            bccAddress: input.bccAddress,
            subject: input.subject,
            encoding: input.encoding,
            mailFormat: input.mailFormat,
            askReceipt: input.askReceipt
        };

        const resp = await nango.post({
            endpoint: endpoint,
            data: postData,
            retries: 3
        });

        return {
            status: resp.data.status,
            data: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
