import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for this action.');

const AccountStatusSchema = z
    .object({
        status: z.string().describe('The current operational status of the account.')
    })
    .describe('The account status details.');

const AccountSubscriptionSchema = z
    .object({
        plan: z.string().nullable().describe('The subscription plan name.'),
        start_datetime: z.string().describe('The subscription start datetime.'),
        status: z.string().describe('The subscription status.'),
        trial_end_datetime: z.string().describe('The trial end datetime.'),
        trial_start_datetime: z.string().describe('The trial start datetime.')
    })
    .passthrough()
    .describe('The current subscription details.');

const AccountMetaSchema = z
    .object({
        analytics_group_id: z.string().describe('The analytics group ID.'),
        company_domain: z.string().describe('The company domain.')
    })
    .passthrough()
    .describe('The account metadata.');

const AccountSettingSchema = z
    .object({
        id: z.number().describe('The setting identifier.'),
        data: z.record(z.string(), z.unknown()).describe('The setting data.'),
        type: z.string().describe('The setting type.')
    })
    .passthrough()
    .describe('An account setting.');

const OutputSchema = z
    .object({
        created_datetime: z.string().describe('The datetime when the account was created.'),
        current_subscription: AccountSubscriptionSchema,
        deactivated_datetime: z.string().nullable().describe('The datetime when the account was deactivated, if applicable.'),
        domain: z.string().describe('The subdomain of the Gorgias account.'),
        meta: AccountMetaSchema,
        settings: z.array(AccountSettingSchema).describe('The account settings.'),
        status: AccountStatusSchema
    })
    .passthrough()
    .describe('Details about the current Gorgias account.');

/**
 * @tags: [read]
 * @tagReason: Reads the current Gorgias account details without making any modifications.
 * @pitfalls: The response contains no top-level account id; `domain` is the account identifier. `current_subscription.plan` is `null` for trialing accounts instead of a plan name.
 */
const action = createAction({
    description: 'Get details about the current Gorgias account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-account
            endpoint: '/api/account',
            retries: 3
        });

        const account = OutputSchema.parse(response.data);
        return account;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
