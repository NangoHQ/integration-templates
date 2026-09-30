import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        include_physical_address: z
            .boolean()
            .optional()
            .describe('When true, also request the physical_address extra field. Example: true')
    })
    .describe('No required input; the summary always describes the connected account.');

const PhysicalAddressSchema = z
    .object({
        address_line1: z.string().optional().describe('The first line of the street address.'),
        address_line2: z.string().optional().describe('The second line of the street address.'),
        address_line3: z.string().optional().describe('The third line of the street address.'),
        city: z.string().optional().describe('The city of the address.'),
        state_code: z.string().optional().describe('The two-letter US/CA state or province code, when applicable.'),
        state_name: z.string().optional().describe('The state, province, or region name for addresses outside the US/CA.'),
        postal_code: z.string().optional().describe('The postal or zip code of the address.'),
        country_code: z.string().optional().describe('The two-letter ISO 3166-1 country code of the address.')
    })
    .describe("The account's physical mailing address.");

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
        organization_phone: z.string().nullable().optional().describe('The phone number of the organization, or null when not set. Example: "+1-555-555-0199"'),
        state_code: z.string().nullable().optional().describe('The two-letter US/CA state or province code configured on the account, when applicable.'),
        website: z.string().nullable().optional().describe('The organization website URL, or null when not set. Example: "https://example.com"'),
        time_zone_id: z.string().describe('The IANA time zone identifier configured for the account. Example: "America/New_York"'),
        physical_address: PhysicalAddressSchema.optional().describe(
            'The account physical mailing address. Only present when include_physical_address is true.'
        )
    })
    .describe("The account's organization and contact profile summary");

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the account summary without mutating any provider state.
 * @pitfalls: The two-letter country code may be returned in lowercase, so avoid case-sensitive comparisons. The physical address is not included by default; set include_physical_address to true to fetch it via the provider's extra_fields query parameter.
 */
const action = createAction({
    description: "Retrieve the account's organization/contact profile summary.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html (GET /v3/account/summary)
        const response = await nango.get({
            endpoint: '/v3/account/summary',
            params: {
                ...(input.include_physical_address && { extra_fields: 'physical_address' })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
