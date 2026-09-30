import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT_FIELDS = [
    'accountid',
    'name',
    'accountnumber',
    'emailaddress1',
    'telephone1',
    'websiteurl',
    'address1_city',
    'address1_country',
    'industrycode',
    'numberofemployees',
    'revenue',
    'createdon',
    'modifiedon'
];

const AccountSchema = z.object({
    accountid: z.string().describe('Unique identifier (GUID) of the account record. Example: "83883308-7ad5-ea11-a813-000d3a33f3b4"'),
    name: z.string().nullable().optional().describe('Company or organization name. Example: "Fabrikam, Inc.". Null when not set on the record.'),
    accountnumber: z.string().nullable().optional().describe('Account number used for cross-referencing the account. Null when not set on the record.'),
    emailaddress1: z.string().nullable().optional().describe('Primary email address of the account. Null when not set on the record.'),
    telephone1: z.string().nullable().optional().describe('Main phone number of the account. Null when not set on the record.'),
    websiteurl: z.string().nullable().optional().describe('Website URL of the account. Null when not set on the record.'),
    address1_city: z.string().nullable().optional().describe('City of the account primary address. Null when not set on the record.'),
    address1_country: z.string().nullable().optional().describe('Country or region of the account primary address. Null when not set on the record.'),
    industrycode: z.number().nullable().optional().describe('Industry classification option-set value of the account. Null when not set on the record.'),
    numberofemployees: z.number().nullable().optional().describe('Number of people employed by the account. Null when not set on the record.'),
    revenue: z.number().nullable().optional().describe('Annual revenue of the account. Null when not set on the record.'),
    createdon: z.string().nullable().optional().describe('UTC timestamp (ISO 8601) when the account record was created. Example: "2026-09-18T19:43:05Z"'),
    modifiedon: z
        .string()
        .nullable()
        .optional()
        .describe(
            'UTC timestamp (ISO 8601) when the account record was last modified. Useful for incremental filters such as "modifiedon gt 2026-01-01T00:00:00Z".'
        )
});

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Account attribute logical names to return (OData $select). "accountid" is always added automatically. Defaults to a common set of account fields. Example: ["accountid", "name", "emailaddress1"]'
            ),
        filter: z
            .string()
            .optional()
            .describe('OData $filter expression applied to accounts. Example: "contains(name, \'Fabrikam\')" or "modifiedon gt 2026-01-01T00:00:00Z"'),
        orderby: z.string().optional().describe('OData $orderby expression for sorting accounts. Example: "name asc" or "modifiedon desc"'),
        top: z
            .number()
            .int()
            .positive()
            .max(5000)
            .optional()
            .describe(
                'Maximum number of accounts to return in this page (OData $top). Example: 50. This is a hard cap in Dataverse: when set, results are truncated at this count and no next_cursor is returned for the remaining matches. Omit to let Dataverse apply its own server-side page size and receive a next_cursor when more accounts exist.'
            ),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque server paging token ($skiptoken) from the next_cursor of a previous response. Omit for the first page, and repeat the same select, filter and orderby values when following it.'
            )
    })
    .describe('Filtering, field selection and paging options for listing accounts.');

const OutputSchema = z
    .object({
        accounts: z.array(AccountSchema).describe('The page of account records returned by Dataverse.'),
        next_cursor: z
            .string()
            .optional()
            .describe('Opaque server paging token for the next page. Present only when more records are available; pass it back as cursor to continue.')
    })
    .describe('A page of accounts with an optional cursor to fetch the next page.');

const DataverseListResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown())),
    '@odata.nextLink': z.string().optional()
});

function extractSkipToken(nextLink: string): string | undefined {
    const match = /[?&]\$skiptoken=([^&]+)/.exec(nextLink);
    const token = match?.[1];
    if (!token) {
        return undefined;
    }
    return decodeURIComponent(token);
}

/**
 * @tags: [read]
 * @tagReason: Only performs a read-only OData GET on the accounts entity set; it never creates, updates, or deletes provider data.
 * @pitfalls: Without top, a single call can return up to the provider's maximum page size (5000 records by default) and next_cursor only appears beyond that; top is a hard cap, so when it truncates the list no next_cursor is returned for the remaining records. Attributes named in select that fall outside this action's output schema are omitted from the returned accounts. This action rejects a response that would exceed a safe serialized size instead of risking the 2 MB action output limit.
 */
const action = createAction({
    description: 'List accounts (companies/organizations) in Microsoft Dataverse.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const selectFields = input.select ? [...new Set([...input.select, 'accountid'])] : DEFAULT_SELECT_FIELDS;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/accounts',
            params: {
                $select: selectFields.join(','),
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = DataverseListResponseSchema.parse(response.data);
        const accounts = parsed.value.map((record) => AccountSchema.parse(record));
        const nextCursor = parsed['@odata.nextLink'] !== undefined ? extractSkipToken(parsed['@odata.nextLink']) : undefined;

        const output: z.infer<typeof OutputSchema> = {
            accounts,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };

        // Without top, a page can hold up to Dataverse's server-side page size (commonly 5000
        // records), and select can request arbitrary attributes, so check the serialized size
        // before returning it rather than risk exceeding Nango's 2 MB action output limit.
        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > 1_900_000) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow the request with a smaller top, a more restrictive select, or a filter, and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
