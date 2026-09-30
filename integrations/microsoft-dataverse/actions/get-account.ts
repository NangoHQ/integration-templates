import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('Unique identifier (GUID) of the account to retrieve. Example: "88cea450-cb0c-ea11-a813-000d3a1b1223"'),
        select: z
            .array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/))
            .optional()
            .describe(
                'Optional list of Dataverse attribute logical names to return on the record (sent as $select), e.g. ["name", "telephone1", "emailaddress1"]. When omitted, all account attributes are returned. The primary key accountid is always included.'
            )
    })
    .describe('Input for retrieving a single Dataverse account by id');

const OutputSchema = z
    .looseObject({
        accountid: z.string().describe('Unique identifier (GUID) of the account.'),
        name: z.string().nullable().optional().describe('Account name (primary name attribute). Null when empty.'),
        accountnumber: z.string().nullable().optional().describe('Account number (attribute accountnumber). Null when empty.'),
        description: z.string().nullable().optional().describe('Free-text description of the account. Null when empty.'),
        telephone1: z.string().nullable().optional().describe('Main phone number of the account. Null when empty.'),
        telephone2: z.string().nullable().optional().describe('Secondary phone number of the account. Null when empty.'),
        fax: z.string().nullable().optional().describe('Fax number of the account. Null when empty.'),
        emailaddress1: z.string().nullable().optional().describe('Primary email address of the account. Null when empty.'),
        emailaddress2: z.string().nullable().optional().describe('Secondary email address of the account. Null when empty.'),
        emailaddress3: z.string().nullable().optional().describe('Third email address of the account. Null when empty.'),
        websiteurl: z.string().nullable().optional().describe('Website URL of the account. Null when empty.'),
        ftpsiteurl: z.string().nullable().optional().describe('FTP site URL of the account. Null when empty.'),
        address1_line1: z.string().nullable().optional().describe('Primary address street line 1. Null when empty.'),
        address1_line2: z.string().nullable().optional().describe('Primary address street line 2. Null when empty.'),
        address1_line3: z.string().nullable().optional().describe('Primary address street line 3. Null when empty.'),
        address1_city: z.string().nullable().optional().describe('Primary address city. Null when empty.'),
        address1_stateorprovince: z.string().nullable().optional().describe('Primary address state or province. Null when empty.'),
        address1_postalcode: z.string().nullable().optional().describe('Primary address postal code. Null when empty.'),
        address1_country: z.string().nullable().optional().describe('Primary address country or region. Null when empty.'),
        numberofemployees: z.number().nullable().optional().describe('Number of employees at the account. Null when empty.'),
        revenue: z.number().nullable().optional().describe("Annual revenue in the organization's base currency. Null when empty."),
        industrycode: z.number().nullable().optional().describe('Industry option set value of the account. Null when empty.'),
        ownershipcode: z.number().nullable().optional().describe('Ownership option set value of the account. Null when empty.'),
        customertypecode: z.number().nullable().optional().describe('Relationship type option set value of the account. Null when empty.'),
        statecode: z.number().nullable().optional().describe('Status of the account: 0 = Active, 1 = Inactive.'),
        statuscode: z.number().nullable().optional().describe('Status reason option set value of the account. Null when empty.'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the owning user or team (owner lookup). Null when unassigned.'),
        _primarycontactid_value: z.string().nullable().optional().describe('GUID of the primary contact (lookup to contacts). Null when unset.'),
        createdon: z.string().nullable().optional().describe('ISO 8601 UTC timestamp of when the account was created. Example: "2021-05-17T18:22:31Z"'),
        modifiedon: z.string().nullable().optional().describe('ISO 8601 UTC timestamp of when the account was last modified. Example: "2021-05-17T18:22:31Z"')
    })
    .describe(
        'A Dataverse account record. Well-known attributes are typed; every other attribute returned by the API (including org-specific custom fields and @odata metadata) is passed through unchanged. Empty attributes are returned as explicit null; attributes excluded by the select input are omitted entirely.'
    );

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET to retrieve one account record; no data is created, modified, or deleted.
 * @pitfalls: A nonexistent or deleted account id fails with a 404 "Does Not Exist" error from the API rather than an empty result, and deleted accounts are unrecoverable through this API (no soft-delete or recycle bin).
 */
const action = createAction({
    description: 'Retrieve a single account by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_impersonation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const select = input.select && input.select.length > 0 ? [...new Set(['accountid', ...input.select])].join(',') : undefined;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/accounts(${encodeURIComponent(input.account_id)})`,
            params: {
                ...(select !== undefined && { $select: select })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
