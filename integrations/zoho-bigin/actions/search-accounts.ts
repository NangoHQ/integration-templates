import { z } from 'zod';
import { createAction } from 'nango';

const UserRefSchema = z.object({
    name: z.string().nullish().describe('Display name of the user.'),
    id: z.string().nullish().describe('Unique ID of the user.'),
    email: z.string().nullish().describe('Email address of the user.')
});

const TagSchema = z
    .object({
        id: z.string().nullish().describe('Unique ID of the tag.'),
        name: z.string().nullish().describe('Name of the tag.'),
        color_code: z.string().nullish().describe('Color code of the tag, or null when the tag has no color set.')
    })
    .passthrough();

const AccountSchema = z
    .object({
        id: z.string().describe('Unique ID of the account record.'),
        Account_Name: z.string().nullable().optional().describe('Name of the account (company).'),
        Account_Number: z.string().nullable().optional().describe('Account number.'),
        Account_Type: z.string().nullable().optional().describe('Type or category of the account.'),
        Account_Site: z.string().nullable().optional().describe('Account site name.'),
        Annual_Revenue: z.number().nullable().optional().describe('Annual revenue of the account.'),
        Employees: z.number().nullable().optional().describe('Number of employees at the account.'),
        Industry: z.string().nullable().optional().describe('Industry the account belongs to.'),
        Ownership: z.string().nullable().optional().describe('Ownership type of the account.'),
        Rating: z.string().nullable().optional().describe('Account rating.'),
        Phone: z.string().nullable().optional().describe('Primary phone number of the account.'),
        Fax: z.string().nullable().optional().describe('Fax number of the account.'),
        Website: z.string().nullable().optional().describe('Website URL of the account.'),
        Ticker_Symbol: z.string().nullable().optional().describe('Stock ticker symbol of the account.'),
        SIC_Code: z.string().nullable().optional().describe('Standard Industrial Classification code.'),
        Description: z.string().nullable().optional().describe('Free-text description of the account.'),
        Billing_Street: z.string().nullable().optional().describe('Billing street address.'),
        Billing_City: z.string().nullable().optional().describe('Billing city.'),
        Billing_State: z.string().nullable().optional().describe('Billing state or province.'),
        Billing_Code: z.string().nullable().optional().describe('Billing postal code.'),
        Billing_Country: z.string().nullable().optional().describe('Billing country.'),
        Shipping_Street: z.string().nullable().optional().describe('Shipping street address.'),
        Shipping_City: z.string().nullable().optional().describe('Shipping city.'),
        Shipping_State: z.string().nullable().optional().describe('Shipping state or province.'),
        Shipping_Code: z.string().nullable().optional().describe('Shipping postal code.'),
        Shipping_Country: z.string().nullable().optional().describe('Shipping country.'),
        Parent_Account: UserRefSchema.nullable().optional().describe('Parent account when this account is a child account.'),
        Owner: UserRefSchema.nullable().optional().describe('User who owns the account.'),
        Created_By: UserRefSchema.nullable().optional().describe('User who created the account.'),
        Modified_By: UserRefSchema.nullable().optional().describe('User who last modified the account.'),
        Created_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the account was created.'),
        Modified_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the account was last modified.'),
        Last_Activity_Time: z.string().nullable().optional().describe('ISO 8601 timestamp of the last activity on the account.'),
        Tag: z.array(TagSchema).nullish().describe('Tags applied to the account.')
    })
    .passthrough();

const InputSchema = z
    .object({
        criteria: z
            .string()
            .optional()
            .describe('COQL-style criteria expression, e.g. "(Account_Name:equals:Zylker Corp)". Provide exactly one of criteria, email, phone, or word.'),
        email: z
            .string()
            .optional()
            .describe('Search all email fields of Accounts for this exact address. Provide exactly one of criteria, email, phone, or word.'),
        phone: z.string().optional().describe('Search all phone fields of Accounts for this number. Provide exactly one of criteria, email, phone, or word.'),
        word: z
            .string()
            .min(2)
            .optional()
            .describe('Free-text word search across Accounts, at least 2 characters. Provide exactly one of criteria, email, phone, or word.'),
        page: z.number().int().positive().optional().describe('Page number to return, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().max(200).optional().describe('Number of records per page (1-200). Defaults to 200.')
    })
    .describe('Input for searching Bigin accounts by a criteria expression, email, phone, or word.');

const OutputSchema = z
    .object({
        accounts: z.array(AccountSchema).describe('Accounts matching the search selector.'),
        page: z.number().optional().describe('Current page number of the result set.'),
        per_page: z.number().optional().describe('Maximum number of records returned per page.'),
        count: z.number().optional().describe('Number of records returned in this page.'),
        more_records: z.boolean().optional().describe('Whether more records are available on subsequent pages.')
    })
    .describe('Accounts matching the search selector together with pagination information.');

const SearchResponseSchema = z.object({
    data: z.array(AccountSchema).optional(),
    info: z
        .object({
            page: z.number().optional(),
            per_page: z.number().optional(),
            count: z.number().optional(),
            more_records: z.boolean().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Searches and returns existing account records without modifying any provider data.
 * @pitfalls: Search results are eventually consistent, so an account created or updated moments earlier may be missing (allow ~10-20s); a search with no matches returns an empty accounts list rather than an error.
 */
const action = createAction({
    description: 'Search accounts by a COQL-style criteria expression, by email, phone, or word.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const selectors = [input.criteria, input.email, input.phone, input.word].filter((value) => value !== undefined);
        if (selectors.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide exactly one of criteria, email, phone, or word to search accounts.'
            });
        }
        if (selectors.length > 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide only one of criteria, email, phone, or word to search accounts.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input.criteria !== undefined) {
            params['criteria'] = input.criteria;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.word !== undefined) {
            params['word'] = input.word;
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://www.bigin.com/developer/docs/apis/search-records.html
        const response = await nango.get({
            endpoint: '/bigin/v2/Accounts/search',
            params,
            retries: 3
        });

        // Bigin signals "no matches" with HTTP 204 and an empty body, not 404 or an empty data array.
        if (response.status === 204) {
            return { accounts: [] };
        }

        const parsed = SearchResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Bigin Accounts search.'
            });
        }

        const info = parsed.data.info;

        return {
            accounts: parsed.data.data ?? [],
            ...(info?.page !== undefined && { page: info.page }),
            ...(info?.per_page !== undefined && { per_page: info.per_page }),
            ...(info?.count !== undefined && { count: info.count }),
            ...(info?.more_records !== undefined && { more_records: info.more_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
