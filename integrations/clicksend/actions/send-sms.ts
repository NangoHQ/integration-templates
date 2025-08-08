import { createAction } from 'nango';
import { toSms } from '../mappers/to-sms.js';
import type { ClickSendSms } from '../types.js';
import { clickSendSendSmsInputSchema } from '../schema.zod.js';

import { Sms, ClickSendSendSmsInput } from '../models.js';

const action = createAction({
    description: "Sends an SMS message via ClickSend's API.",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/sms/send',
        group: 'SMS'
    },

    input: ClickSendSendSmsInput,
    output: Sms,

    exec: async (nango, input): Promise<Sms> => {
        await nango.zodValidateInput({ zodSchema: clickSendSendSmsInputSchema, input });

        const payload = {
            messages: [
                {
                    to: input.to,
                    body: input.body
                }
            ]
        };

        const response = await nango.post<{ data: { messages: ClickSendSms[] } }>({
            // https://developers.clicksend.com/docs/messaging/sms/other/send-sms
            endpoint: '/v3/sms/send',
            data: payload,
            retries: 3
        });

        const clickSendSms = response.data?.data?.messages?.[0];

        if (!clickSendSms) {
            throw new nango.ActionError({
                message: 'Invalid response from ClickSend API - no message data returned'
            });
        }

        return toSms(clickSendSms);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
