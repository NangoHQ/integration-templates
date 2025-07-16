import type { Sms } from ../models.js;
import type { ClickSendSms } from '../types.js';

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
        status: toStatus(message.status),

        // UNIX timestamp to ISO date
        createdAt: new Date(message.date * 1000).toISOString(),
        updatedAt: new Date(message.date * 1000).toISOString()
    };
}

function toStatus(status: ClickSendSms['status']): Sms['status'] {
    switch (status) {
        case 'Queued':
            return 'QUEUED';
        case 'Completed':
            return 'COMPLETED';
        case 'Scheduled':
            return 'SCHEDULED';
        case 'WaitApproval':
            return 'WAIT_APPROVAL';
        case 'Failed':
            return 'FAILED';
        case 'Cancelled':
            return 'CANCELLED';
        case 'CancelledAfterReview':
            return 'CANCELLED_AFTER_REVIEW';
        case 'Received':
            return 'RECEIVED';
        case 'Sent':
            return 'SENT';
        case 'SUCCESS':
            return 'SUCCESS';
        default:
            throw new Error(`Unknown SMS status: ${typeof status === 'string' ? status : JSON.stringify(status)}`);
    }
}
