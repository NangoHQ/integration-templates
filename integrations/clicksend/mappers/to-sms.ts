import type { Sms } from '../../models';
import type { ClickSendSms } from '../types';

/**
 * Converts a ClickSendSms object from ClickSend's API into the standardized internal Sms model.
 * Only essential properties are mapped and timestamps are converted to ISO strings.
 *
 * @param message - The ClickSendSms object to convert.
 * @returns Sms - The mapped internal Sms object.
 */
export function toSms(message: ClickSendSms): Sms {
    return {
        id: message.message_id,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status,

        // UNIX timestamp to ISO date
        createdAt: new Date(message.date * 1000).toISOString(),
        updatedAt: new Date(message.date * 1000).toISOString()
    };
}
