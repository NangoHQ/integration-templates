import type { ClickSendSendSmsInput, NangoAction, Sms } from '../../models.js';
import { toSms } from '../mappers/to-sms.js';
import type { ClickSendSms } from '../types.js';
import { clickSendSendSmsInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ClickSendSendSmsInput): Promise<Sms> {
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
