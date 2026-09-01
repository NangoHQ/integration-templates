import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const IdentitySchema = z
    .object({
        id: z.number().describe('The unique identifier for the token owner.'),
        email_address: z.string().describe('The email address of the token owner.'),
        first_name: z.string().describe('The first name of the token owner.'),
        last_name: z.string().describe('The last name of the token owner.')
    })
    .describe("The token owner's identity details.");

const AccountSchema = z
    .object({
        id: z.number().describe('The unique identifier for the account, used as the account_id in https://3.basecampapi.com/{account_id}.'),
        name: z.string().describe('The display name of the account.'),
        product: z.string().describe('The 37signals product name (e.g., "bc3" for Basecamp 3).'),
        href: z.string().describe('The API base URL for this account.'),
        app_href: z.string().describe('The web application URL for this account.'),
        hidden: z.boolean().optional().describe('Whether the account is hidden from the account switcher, when reported.')
    })
    .describe('A 37signals account or product accessible with the token.');

const OutputSchema = z
    .object({
        expires_at: z.string().describe('ISO 8601 timestamp when the token expires.'),
        identity: IdentitySchema,
        accounts: z.array(AccountSchema).describe('The list of Basecamp accounts and other 37signals products accessible with this token.')
    })
    .describe('The token owner identity and list of accessible Basecamp accounts and other 37signals products.');

const ProviderResponseSchema = z.object({
    expires_at: z.string(),
    identity: IdentitySchema,
    accounts: z.array(AccountSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves the token owner's identity and accessible accounts from the provider's identity endpoint.
 */
const action = createAction({
    description: "Get the token owner's identity and the list of Basecamp accounts (and other 37signals products) the token can access.",
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/authentication.md
        const response = await nango.get({
            baseUrlOverride: 'https://launchpad.37signals.com',
            endpoint: '/authorization.json',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            expires_at: providerData.expires_at,
            identity: providerData.identity,
            accounts: providerData.accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
