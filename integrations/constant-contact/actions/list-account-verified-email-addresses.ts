import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters. Returns the confirmed email addresses registered on the Constant Contact account.');

const ProviderEmailAddressSchema = z.object({
    email_id: z.number(),
    email_address: z.string(),
    confirm_status: z.string().optional(),
    confirm_time: z.string().nullable().optional(),
    roles: z.array(z.string()).optional(),
    pending_role_changes: z.array(z.string()).optional()
});

const EmailAddressSchema = z
    .object({
        email_id: z.number().describe('Unique numeric ID of the email address on the account. Example: 1'),
        email_address: z.string().describe('The registered email address. Example: "api@nango.dev"'),
        confirm_status: z
            .string()
            .optional()
            .describe('Confirmation status of the address. Always "CONFIRMED", since this action only returns confirmed addresses.'),
        confirm_time: z.string().optional().describe('ISO 8601 timestamp of when the address was confirmed. Omitted when the address has not been confirmed.'),
        roles: z
            .array(z.string())
            .optional()
            .describe('Account roles assigned to the address, e.g. "BILLING", "CONTACT", "DEFAULT_FROM", "REPLY_TO", "JOURNALING", "OTHER".'),
        pending_role_changes: z.array(z.string()).optional().describe('Roles that have been requested for the address but are not yet in effect.')
    })
    .describe('A single email address registered on the account.');

const OutputSchema = z
    .object({
        emails: z.array(EmailAddressSchema).describe('Confirmed sender/reply-to email addresses registered on the account, with their roles.')
    })
    .describe("The Constant Contact account's confirmed sender/reply-to email addresses and their roles.");

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to list the account's confirmed email addresses; it does not mutate any provider state.
 * @pitfalls: Only addresses with confirm_status "CONFIRMED" are returned (filtered server-side via confirm_status=CONFIRMED), matching this action's verified-email contract; an address the account owner has added but not yet confirmed will not appear here.
 */
const action = createAction({
    description: "List the account's verified (confirmed) sender/reply-to email addresses and their roles.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account_read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html — confirm_status query param supports CONFIRMED/UNCONFIRMED
        const response = await nango.get({
            endpoint: '/v3/account/emails',
            params: {
                confirm_status: 'CONFIRMED'
            },
            retries: 3
        });

        const emails = z.array(ProviderEmailAddressSchema).parse(response.data);

        return {
            emails: emails.map((email) => ({
                email_id: email.email_id,
                email_address: email.email_address,
                ...(email.confirm_status !== undefined && { confirm_status: email.confirm_status }),
                ...(email.confirm_time != null && { confirm_time: email.confirm_time }),
                ...(email.roles !== undefined && { roles: email.roles }),
                ...(email.pending_role_changes !== undefined && { pending_role_changes: email.pending_role_changes })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
