import type { ClickSendAccount } from '../types';
import type { Account } from '../../models';

/**
 * Converts a ClickSendAccount object from ClickSend's API into the standardized internal Account model.
 * It ensures consistent formatting and naming conventions across Nango integrations.
 *
 * Notes:
 * - `id` is cast to a string from numeric `user_id`.
 * - `name` is composed from `user_first_name` and `user_last_name`.
 *
 * @param data - The ClickSendAccount object returned by the ClickSend API.
 * @returns Account - The normalized internal representation used by Nango.
 */
export function toAccount(data: ClickSendAccount): Account {
    return {
        id: data.user_id.toString(),
        name: [data.user_first_name, data.user_last_name].filter(Boolean).join(' ').trim(),
        email: data.user_email,
        phone: data.user_phone,
        balance: data.balance,
        country: data.country,
        timezone: data.timezone,
        accountName: data.account_name,
        accountBillingEmail: data.account_billing_email
    };
}
