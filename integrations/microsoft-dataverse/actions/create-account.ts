import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Account name. Example: "Fabrikam, Inc."'),
        telephone1: z.string().optional().describe('Main phone number. Example: "+1-425-555-0100"'),
        telephone2: z.string().optional().describe('Secondary phone number. Example: "+1-425-555-0101"'),
        fax: z.string().optional().describe('Fax number. Example: "+1-425-555-0102"'),
        websiteurl: z.string().optional().describe('Website URL. Example: "https://www.fabrikam.com"'),
        emailaddress1: z.string().optional().describe('Primary email address. Example: "info@fabrikam.com"'),
        description: z.string().optional().describe('Free-text description of the account.'),
        numberofemployees: z.number().int().optional().describe('Number of employees. Example: 250'),
        revenue: z.number().optional().describe('Annual revenue in the org base currency. Example: 5000000'),
        sic: z.string().optional().describe('Standard Industrial Classification (SIC) code. Example: "7372"'),
        tickersymbol: z.string().optional().describe('Stock ticker symbol. Example: "FBKM"'),
        address1_line1: z.string().optional().describe('Primary street address, line 1. Example: "123 Main St"'),
        address1_line2: z.string().optional().describe('Primary street address, line 2. Example: "Suite 400"'),
        address1_city: z.string().optional().describe('Primary address city. Example: "Redmond"'),
        address1_stateorprovince: z.string().optional().describe('Primary address state or province. Example: "WA"'),
        address1_postalcode: z.string().optional().describe('Primary address postal code. Example: "98052"'),
        address1_country: z.string().optional().describe('Primary address country or region. Example: "United States"')
    })
    .describe('Fields of the account to create. Only "name" is required.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (GUID) of the created account. Example: "98653c1a-0f1b-4c2d-9e3f-1a2b3c4d5e6f"'),
        name: z.string().optional().describe('Account name.'),
        telephone1: z.string().optional().describe('Main phone number.'),
        telephone2: z.string().optional().describe('Secondary phone number.'),
        fax: z.string().optional().describe('Fax number.'),
        websiteurl: z.string().optional().describe('Website URL.'),
        emailaddress1: z.string().optional().describe('Primary email address.'),
        description: z.string().optional().describe('Free-text description of the account.'),
        numberofemployees: z.number().optional().describe('Number of employees.'),
        revenue: z.number().optional().describe('Annual revenue in the org base currency.'),
        sic: z.string().optional().describe('Standard Industrial Classification (SIC) code.'),
        tickersymbol: z.string().optional().describe('Stock ticker symbol.'),
        address1_line1: z.string().optional().describe('Primary street address, line 1.'),
        address1_line2: z.string().optional().describe('Primary street address, line 2.'),
        address1_city: z.string().optional().describe('Primary address city.'),
        address1_stateorprovince: z.string().optional().describe('Primary address state or province.'),
        address1_postalcode: z.string().optional().describe('Primary address postal code.'),
        address1_country: z.string().optional().describe('Primary address country or region.')
    })
    .describe('The created account, read back from Dataverse after creation. Unset fields are omitted.');

const ProviderAccountSchema = z.object({
    accountid: z.string(),
    name: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    telephone2: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    numberofemployees: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    sic: z.string().nullable().optional(),
    tickersymbol: z.string().nullable().optional(),
    address1_line1: z.string().nullable().optional(),
    address1_line2: z.string().nullable().optional(),
    address1_city: z.string().nullable().optional(),
    address1_stateorprovince: z.string().nullable().optional(),
    address1_postalcode: z.string().nullable().optional(),
    address1_country: z.string().nullable().optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Creates an account with a provider mutation (POST) and reads the created record back with a provider read (GET) to return it.
 * @pitfalls: Dataverse does not enforce account name uniqueness; invoking this action twice with the same name creates two distinct account records with different ids.
 */
const action = createAction({
    description: 'Create an account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
            endpoint: '/api/data/v9.2/accounts',
            // retries: 0 is deliberate: POST create is not idempotent, so retrying after a lost response would create a duplicate account
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0,
            data: {
                name: input.name,
                ...(input.telephone1 !== undefined && { telephone1: input.telephone1 }),
                ...(input.telephone2 !== undefined && { telephone2: input.telephone2 }),
                ...(input.fax !== undefined && { fax: input.fax }),
                ...(input.websiteurl !== undefined && { websiteurl: input.websiteurl }),
                ...(input.emailaddress1 !== undefined && { emailaddress1: input.emailaddress1 }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.numberofemployees !== undefined && { numberofemployees: input.numberofemployees }),
                ...(input.revenue !== undefined && { revenue: input.revenue }),
                ...(input.sic !== undefined && { sic: input.sic }),
                ...(input.tickersymbol !== undefined && { tickersymbol: input.tickersymbol }),
                ...(input.address1_line1 !== undefined && { address1_line1: input.address1_line1 }),
                ...(input.address1_line2 !== undefined && { address1_line2: input.address1_line2 }),
                ...(input.address1_city !== undefined && { address1_city: input.address1_city }),
                ...(input.address1_stateorprovince !== undefined && { address1_stateorprovince: input.address1_stateorprovince }),
                ...(input.address1_postalcode !== undefined && { address1_postalcode: input.address1_postalcode }),
                ...(input.address1_country !== undefined && { address1_country: input.address1_country })
            }
        };
        const createResponse = await nango.post(createConfig);

        // Create returns 204 No Content; the new record URL is in the OData-EntityId header, e.g. .../api/data/v9.2/accounts({guid})
        const entityIdHeader: unknown = createResponse.headers['odata-entityid'];
        const entityIdMatch = typeof entityIdHeader === 'string' ? entityIdHeader.match(/\(([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\)/) : null;
        const accountId = entityIdMatch?.[1];

        if (!accountId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Account create returned no OData-EntityId header with the new record id.'
            });
        }

        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/accounts(${encodeURIComponent(accountId)})`,
            params: {
                $select:
                    'accountid,name,telephone1,telephone2,fax,websiteurl,emailaddress1,description,numberofemployees,revenue,sic,tickersymbol,address1_line1,address1_line2,address1_city,address1_stateorprovince,address1_postalcode,address1_country'
            },
            retries: 3
        };
        const response = await nango.get(getConfig);

        const account = ProviderAccountSchema.parse(response.data);

        return {
            id: account.accountid,
            ...(account.name != null && { name: account.name }),
            ...(account.telephone1 != null && { telephone1: account.telephone1 }),
            ...(account.telephone2 != null && { telephone2: account.telephone2 }),
            ...(account.fax != null && { fax: account.fax }),
            ...(account.websiteurl != null && { websiteurl: account.websiteurl }),
            ...(account.emailaddress1 != null && { emailaddress1: account.emailaddress1 }),
            ...(account.description != null && { description: account.description }),
            ...(account.numberofemployees != null && { numberofemployees: account.numberofemployees }),
            ...(account.revenue != null && { revenue: account.revenue }),
            ...(account.sic != null && { sic: account.sic }),
            ...(account.tickersymbol != null && { tickersymbol: account.tickersymbol }),
            ...(account.address1_line1 != null && { address1_line1: account.address1_line1 }),
            ...(account.address1_line2 != null && { address1_line2: account.address1_line2 }),
            ...(account.address1_city != null && { address1_city: account.address1_city }),
            ...(account.address1_stateorprovince != null && { address1_stateorprovince: account.address1_stateorprovince }),
            ...(account.address1_postalcode != null && { address1_postalcode: account.address1_postalcode }),
            ...(account.address1_country != null && { address1_country: account.address1_country })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
