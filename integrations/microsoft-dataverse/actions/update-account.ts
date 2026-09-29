import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        accountid: z.string().describe('GUID of the account to update. Example: "4f2d9c1e-7a3b-4c5d-8e9f-1a2b3c4d5e6f".'),
        name: z.string().nullable().optional().describe('Account name.'),
        accountnumber: z.string().nullable().optional().describe('Account number.'),
        telephone1: z.string().nullable().optional().describe('Main phone number.'),
        telephone2: z.string().nullable().optional().describe('Other phone number.'),
        fax: z.string().nullable().optional().describe('Fax number.'),
        emailaddress1: z.string().nullable().optional().describe('Primary email address.'),
        emailaddress2: z.string().nullable().optional().describe('Secondary email address.'),
        websiteurl: z.string().nullable().optional().describe('Website URL. Example: "https://www.example.com".'),
        description: z.string().nullable().optional().describe('Free-text description of the account.'),
        sic: z.string().nullable().optional().describe('Standard Industrial Classification (SIC) code.'),
        tickersymbol: z.string().nullable().optional().describe('Stock exchange ticker symbol.'),
        numberofemployees: z.number().int().nullable().optional().describe('Number of employees. Example: 250.'),
        revenue: z.number().nullable().optional().describe('Annual revenue in the base currency of the org. Example: 1000000.'),
        industrycode: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('Industry option-set value. Use an integer option value from the account industrycode picklist.'),
        address1_line1: z.string().nullable().optional().describe('Primary address line 1.'),
        address1_line2: z.string().nullable().optional().describe('Primary address line 2.'),
        address1_line3: z.string().nullable().optional().describe('Primary address line 3.'),
        address1_city: z.string().nullable().optional().describe('Primary address city.'),
        address1_stateorprovince: z.string().nullable().optional().describe('Primary address state or province.'),
        address1_postalcode: z.string().nullable().optional().describe('Primary address postal code.'),
        address1_country: z.string().nullable().optional().describe('Primary address country or region.')
    })
    .describe('Fields to update on the account. Only provided fields are sent: omitted fields stay unchanged, and fields explicitly set to null are cleared.');

const ProviderAccountSchema = z.object({
    accountid: z.string(),
    name: z.string().nullable().optional(),
    accountnumber: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    telephone2: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    emailaddress2: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    sic: z.string().nullable().optional(),
    tickersymbol: z.string().nullable().optional(),
    numberofemployees: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    industrycode: z.number().nullable().optional(),
    address1_line1: z.string().nullable().optional(),
    address1_line2: z.string().nullable().optional(),
    address1_line3: z.string().nullable().optional(),
    address1_city: z.string().nullable().optional(),
    address1_stateorprovince: z.string().nullable().optional(),
    address1_postalcode: z.string().nullable().optional(),
    address1_country: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        accountid: z.string().describe('GUID of the updated account.'),
        name: z.string().optional().describe('Account name.'),
        accountnumber: z.string().optional().describe('Account number.'),
        telephone1: z.string().optional().describe('Main phone number.'),
        telephone2: z.string().optional().describe('Other phone number.'),
        fax: z.string().optional().describe('Fax number.'),
        emailaddress1: z.string().optional().describe('Primary email address.'),
        emailaddress2: z.string().optional().describe('Secondary email address.'),
        websiteurl: z.string().optional().describe('Website URL.'),
        description: z.string().optional().describe('Free-text description of the account.'),
        sic: z.string().optional().describe('Standard Industrial Classification (SIC) code.'),
        tickersymbol: z.string().optional().describe('Stock exchange ticker symbol.'),
        numberofemployees: z.number().optional().describe('Number of employees.'),
        revenue: z.number().optional().describe('Annual revenue in the base currency of the org.'),
        industrycode: z.number().optional().describe('Industry option-set value.'),
        address1_line1: z.string().optional().describe('Primary address line 1.'),
        address1_line2: z.string().optional().describe('Primary address line 2.'),
        address1_line3: z.string().optional().describe('Primary address line 3.'),
        address1_city: z.string().optional().describe('Primary address city.'),
        address1_stateorprovince: z.string().optional().describe('Primary address state or province.'),
        address1_postalcode: z.string().optional().describe('Primary address postal code.'),
        address1_country: z.string().optional().describe('Primary address country or region.')
    })
    .describe('The updated account, read back after the update. Fields with no value are omitted.');

/**
 * @tags: [read, write]
 * @tagReason: Updates an account record via PATCH (provider mutation) and reads the updated record back via GET (provider read).
 * @pitfalls: The update is a partial merge: omitted fields keep their current values, while a field explicitly set to null permanently clears its stored value.
 */
const action = createAction({
    description: "Update an account's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.accountnumber !== undefined && { accountnumber: input.accountnumber }),
            ...(input.telephone1 !== undefined && { telephone1: input.telephone1 }),
            ...(input.telephone2 !== undefined && { telephone2: input.telephone2 }),
            ...(input.fax !== undefined && { fax: input.fax }),
            ...(input.emailaddress1 !== undefined && { emailaddress1: input.emailaddress1 }),
            ...(input.emailaddress2 !== undefined && { emailaddress2: input.emailaddress2 }),
            ...(input.websiteurl !== undefined && { websiteurl: input.websiteurl }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.sic !== undefined && { sic: input.sic }),
            ...(input.tickersymbol !== undefined && { tickersymbol: input.tickersymbol }),
            ...(input.numberofemployees !== undefined && { numberofemployees: input.numberofemployees }),
            ...(input.revenue !== undefined && { revenue: input.revenue }),
            ...(input.industrycode !== undefined && { industrycode: input.industrycode }),
            ...(input.address1_line1 !== undefined && { address1_line1: input.address1_line1 }),
            ...(input.address1_line2 !== undefined && { address1_line2: input.address1_line2 }),
            ...(input.address1_line3 !== undefined && { address1_line3: input.address1_line3 }),
            ...(input.address1_city !== undefined && { address1_city: input.address1_city }),
            ...(input.address1_stateorprovince !== undefined && { address1_stateorprovince: input.address1_stateorprovince }),
            ...(input.address1_postalcode !== undefined && { address1_postalcode: input.address1_postalcode }),
            ...(input.address1_country !== undefined && { address1_country: input.address1_country })
        };

        // PATCH sets absolute field values, so a retry after a lost response reapplies the same update and stays idempotent.
        const patchConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api
            endpoint: `/api/data/v9.2/accounts(${encodeURIComponent(input.accountid)})`,
            data,
            retries: 3
        };
        await nango.patch(patchConfig);

        // The update returns 204 with no body (Prefer: return=representation is not honored through this proxy path), so the updated record is read back with a separate GET.
        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/accounts(${encodeURIComponent(input.accountid)})`,
            params: {
                $select:
                    'accountid,name,accountnumber,telephone1,telephone2,fax,emailaddress1,emailaddress2,websiteurl,description,sic,tickersymbol,numberofemployees,revenue,industrycode,address1_line1,address1_line2,address1_line3,address1_city,address1_stateorprovince,address1_postalcode,address1_country'
            },
            retries: 3
        };
        const response = await nango.get(getConfig);

        const account = ProviderAccountSchema.parse(response.data);

        return {
            accountid: account.accountid,
            ...(account.name != null && { name: account.name }),
            ...(account.accountnumber != null && { accountnumber: account.accountnumber }),
            ...(account.telephone1 != null && { telephone1: account.telephone1 }),
            ...(account.telephone2 != null && { telephone2: account.telephone2 }),
            ...(account.fax != null && { fax: account.fax }),
            ...(account.emailaddress1 != null && { emailaddress1: account.emailaddress1 }),
            ...(account.emailaddress2 != null && { emailaddress2: account.emailaddress2 }),
            ...(account.websiteurl != null && { websiteurl: account.websiteurl }),
            ...(account.description != null && { description: account.description }),
            ...(account.sic != null && { sic: account.sic }),
            ...(account.tickersymbol != null && { tickersymbol: account.tickersymbol }),
            ...(account.numberofemployees != null && { numberofemployees: account.numberofemployees }),
            ...(account.revenue != null && { revenue: account.revenue }),
            ...(account.industrycode != null && { industrycode: account.industrycode }),
            ...(account.address1_line1 != null && { address1_line1: account.address1_line1 }),
            ...(account.address1_line2 != null && { address1_line2: account.address1_line2 }),
            ...(account.address1_line3 != null && { address1_line3: account.address1_line3 }),
            ...(account.address1_city != null && { address1_city: account.address1_city }),
            ...(account.address1_stateorprovince != null && { address1_stateorprovince: account.address1_stateorprovince }),
            ...(account.address1_postalcode != null && { address1_postalcode: account.address1_postalcode }),
            ...(account.address1_country != null && { address1_country: account.address1_country })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
