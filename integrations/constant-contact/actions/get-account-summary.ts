import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required; the summary always describes the connected account.');

const OutputSchema = z
    .object({
        contact_email: z.string().describe('The email address of the account contact. Example: "billing@example.com"'),
        contact_phone: z.string().nullable().optional().describe('The phone number of the account contact, or null when not set. Example: "+1-555-555-0100"'),
        country_code: z.string().describe('The two-letter ISO 3166-1 country code configured for the account. Example: "US"'),
        encoded_account_id: z.string().describe('The unique encoded identifier of the Constant Contact account'),
        encoded_partner_id: z
            .string()
            .nullable()
            .optional()
            .describe('The encoded identifier of the partner associated with the account, or null for accounts without a partner'),
        first_name: z.string().nullable().optional().describe('The first name of the account contact, or null when not set'),
        last_name: z.string().nullable().optional().describe('The last name of the account contact, or null when not set'),
        organization_name: z.string().nullable().optional().describe('The organization name configured on the account, or null when not set'),
        time_zone_id: z.string().describe('The IANA time zone identifier configured for the account. Example: "America/New_York"')
    })
    .describe("The account's organization and contact profile summary");

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the account summary without mutating any provider state.
 * @pitfalls: The summary contains no street or mailing address fields, and no verified endpoint exposes the account's physical address elsewhere in the API. The two-letter country code may be returned in lowercase, so avoid case-sensitive comparisons.
 */
const action = createAction({
    description: "Retrieve the account's organization/contact profile summary.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account_read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html (GET /v3/account/summary)
        const response = await nango.get({
            endpoint: '/v3/account/summary',
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
