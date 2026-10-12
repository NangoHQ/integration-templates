import { createAction } from 'nango';
import * as z from 'zod';

// Bigin rejects page-number requests that reach past the first 2000 records; only page_token can go further.
const PAGE_WINDOW_LIMIT = 2000;

const DEFAULT_FIELDS =
    'id,Account_Name,Phone,Website,Description,Billing_Street,Billing_City,Billing_State,Billing_Code,Billing_Country,Owner,Created_By,Modified_By,Created_Time,Modified_Time,Tag';

const UserRefSchema = z
    .object({
        id: z.string().describe('User ID. Example: "7618134000000627001"'),
        name: z.string().nullish().describe('User display name. Example: "Nango Developer"'),
        email: z.string().nullish().describe('User email address. Example: "api@nango.dev"')
    })
    .passthrough();

const TagSchema = z
    .object({
        id: z.string().describe('Tag ID.'),
        name: z.string().nullish().describe('Tag name. Example: "nango-test"'),
        color_code: z.string().nullish().describe('Tag color code, or null when the tag has no color set.')
    })
    .passthrough();

const AccountSchema = z
    .object({
        id: z.string().describe('Unique account (company) record ID. Example: "7618134000000632027"'),
        Account_Name: z.string().optional().describe('Account (company) name. Example: "Zylker Corp"'),
        Phone: z.string().optional().describe('Company phone number.'),
        Website: z.string().optional().describe('Company website.'),
        Description: z.string().optional().describe('Free-text description of the company.'),
        Billing_Street: z.string().optional().describe('Billing street address.'),
        Billing_City: z.string().optional().describe('Billing city.'),
        Billing_State: z.string().optional().describe('Billing state or province.'),
        Billing_Code: z.string().optional().describe('Billing postal code.'),
        Billing_Country: z.string().optional().describe('Billing country.'),
        Owner: UserRefSchema.optional().describe('User who owns the account record.'),
        Created_By: UserRefSchema.optional().describe('User who created the account record.'),
        Modified_By: UserRefSchema.optional().describe('User who last modified the account record.'),
        Created_Time: z.string().optional().describe('Creation timestamp in ISO 8601 format. Example: "2026-10-07T03:21:34+03:00"'),
        Modified_Time: z.string().optional().describe('Last modification timestamp in ISO 8601 format.'),
        Tag: z.array(TagSchema).optional().describe('Tags attached to the account record.')
    })
    .passthrough();

const ProviderAccountSchema = z
    .object({
        id: z.string(),
        Account_Name: z.string().nullish(),
        Phone: z.string().nullish(),
        Website: z.string().nullish(),
        Description: z.string().nullish(),
        Billing_Street: z.string().nullish(),
        Billing_City: z.string().nullish(),
        Billing_State: z.string().nullish(),
        Billing_Code: z.string().nullish(),
        Billing_Country: z.string().nullish(),
        Owner: UserRefSchema.nullish(),
        Created_By: UserRefSchema.nullish(),
        Modified_By: UserRefSchema.nullish(),
        Created_Time: z.string().nullish(),
        Modified_Time: z.string().nullish(),
        Tag: z.array(TagSchema).nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAccountSchema).nullish(),
    info: z
        .object({
            per_page: z.number().nullish(),
            count: z.number().nullish(),
            page: z.number().nullish(),
            more_records: z.boolean().nullish(),
            next_page_token: z.string().nullish()
        })
        .passthrough()
        .nullish()
});

const InputSchema = z
    .object({
        page: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Page number to fetch, starting at 1. Cannot be combined with page_token. Defaults to 1. Example: 1'),
        per_page: z
            .number()
            .int()
            .positive()
            .max(200)
            .optional()
            .describe('Number of accounts per page, between 1 and 200. Defaults to 200. Ignored with page_token, which encodes its page size. Example: 50'),
        page_token: z
            .string()
            .optional()
            .describe('Opaque token from a previous response next_page_token, used to read records beyond the first 2000. Cannot be combined with page.'),
        fields: z
            .string()
            .min(1)
            .optional()
            .describe(
                'Comma-separated Bigin account field API names to return, up to 50. Defaults to a standard set of account fields. Example: "id,Account_Name,Phone"'
            )
    })
    .describe('Filters and pagination options for listing Bigin accounts (companies).');

const OutputSchema = z
    .object({
        accounts: z.array(AccountSchema).describe('Accounts (companies) on the requested page.'),
        page: z.number().describe('Current page number of the returned records.'),
        per_page: z.number().describe('Number of records requested per page.'),
        count: z.number().describe('Number of accounts returned in this response.'),
        more_records: z.boolean().describe('Whether more accounts are available beyond this page.'),
        next_page: z
            .number()
            .optional()
            .describe(
                'Next page number to request when more_records is true. Omitted once the next page would pass the first 2000 records; use next_page_token instead.'
            ),
        next_page_token: z.string().optional().describe('Token to fetch records beyond the 2000-record limit when more_records is true.')
    })
    .describe('A page of Bigin accounts (companies) together with pagination metadata.');

function omitNulls(record: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (value !== null && value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

/**
 * @tags: [read]
 * @tagReason: Reads account (company) records from the Bigin Accounts module; performs no provider mutations.
 * @pitfalls: An empty result (no accounts, or an org with zero accounts) returns an empty `accounts` array with count 0 rather than an error; page-based paging cannot reach past the first 2000 records, so deeper results require `page_token` from a prior response's `next_page_token`, and `page` and `page_token` cannot be combined; Bigin's UI labels this module "Companies" though its API name is "Accounts".
 */
const action = createAction({
    description: 'List accounts (companies) in the Bigin org, paginated.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.page !== undefined && input.page_token !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide either page or page_token, not both.'
            });
        }

        const params: Record<string, string | number> = {
            fields: input.fields ?? DEFAULT_FIELDS
        };
        if (input.page_token !== undefined) {
            // The page size is encoded in the token; Bigin ignores a token sent with a different per_page.
            params['page_token'] = input.page_token;
        } else {
            if (input.page !== undefined) {
                params['page'] = input.page;
            }
            if (input.per_page !== undefined) {
                params['per_page'] = input.per_page;
            }
        }

        const response = await nango.get<unknown>({
            // https://www.bigin.com/developer/docs/apis/v2/get-records.html
            endpoint: '/bigin/v2/Accounts',
            params,
            retries: 3
        });

        if (response.status === 204 || response.data === '' || response.data === null || response.data === undefined) {
            return {
                accounts: [],
                page: input.page ?? 1,
                per_page: input.per_page ?? 200,
                count: 0,
                more_records: false
            };
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const records = parsed.data ?? [];
        const info = parsed.info;

        const accounts = records.map((record) => AccountSchema.parse(omitNulls(record)));

        const page = info?.page ?? input.page ?? 1;
        const perPage = info?.per_page ?? input.per_page ?? 200;
        const moreRecords = info?.more_records ?? false;
        const nextPageToken = info?.next_page_token;
        const nextPageReachable = input.page_token === undefined && (page + 1) * perPage <= PAGE_WINDOW_LIMIT;

        return {
            accounts,
            page,
            per_page: perPage,
            count: info?.count ?? accounts.length,
            more_records: moreRecords,
            ...(moreRecords && nextPageReachable && { next_page: page + 1 }),
            ...(nextPageToken != null && { next_page_token: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
