import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_FIELDS = 'id,First_Name,Last_Name,Email,Phone,Mobile,Account_Name,Owner,Created_Time,Modified_Time';

const InputSchema = z
    .object({
        account_id: z.string().describe('Unique ID of the account whose linked contacts to list. Example: "7618134000000632027"'),
        fields: z
            .string()
            .optional()
            .describe(
                'Comma-separated Bigin contact field API names to return for each record (max 50). Defaults to "id,First_Name,Last_Name,Email,Phone,Mobile,Account_Name,Owner,Created_Time,Modified_Time".'
            ),
        page: z.number().int().positive().optional().describe('Page number to retrieve, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of contacts to return per page. Defaults to 200.')
    })
    .describe('Input for listing the contacts linked to a Bigin account.');

const ContactSchema = z
    .object({
        id: z.string().optional().describe('Unique contact record ID.'),
        First_Name: z.string().nullable().optional().describe("Contact's first name."),
        Last_Name: z.string().nullable().optional().describe("Contact's last name."),
        Email: z.string().nullable().optional().describe("Contact's email address."),
        Phone: z.string().nullable().optional().describe("Contact's work phone number."),
        Mobile: z.string().nullable().optional().describe("Contact's mobile phone number."),
        Account_Name: z
            .object({
                id: z.string().optional().describe('Linked account record ID.'),
                name: z.string().optional().describe('Linked account name.')
            })
            .nullable()
            .optional()
            .describe('Account (company) the contact belongs to, when one is linked.'),
        Owner: z
            .object({
                id: z.string().optional().describe('Owner user ID.'),
                name: z.string().optional().describe('Owner display name.'),
                email: z.string().nullable().optional().describe('Owner email address.')
            })
            .nullable()
            .optional()
            .describe('Bigin user who owns the record.'),
        Created_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was created.'),
        Modified_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was last modified.')
    })
    .passthrough()
    .describe('A contact linked to the account, containing the requested fields.');

const ProviderResponseSchema = z
    .object({
        data: z.array(ContactSchema).optional(),
        info: z
            .object({
                per_page: z.number().optional(),
                count: z.number().optional(),
                page: z.number().optional(),
                more_records: z.boolean().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts linked to the account. Empty when the account has no linked contacts.'),
        page: z.number().optional().describe('Page number of the returned results.'),
        per_page: z.number().optional().describe('Maximum number of contacts returned per page.'),
        count: z.number().optional().describe('Number of contacts returned on this page.'),
        more_records: z.boolean().optional().describe('Whether more contacts are available beyond this page.')
    })
    .describe('Contacts linked to the account, along with pagination information.');

/**
 * @tags: [read]
 * @tagReason: Reads the contacts linked to an account from Bigin; it does not modify any provider data.
 * @pitfalls: Only one page of contacts is returned per call (at most per_page, default 200), so check more_records to page through everything; a nonexistent account_id fails with a provider error instead of returning an empty list.
 */
const action = createAction({
    description: 'List all contacts currently linked to (belonging to) a given account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get<unknown>({
            // https://www.bigin.com/developer/docs/apis/get-related-records.html
            endpoint: `/bigin/v2/Accounts/${encodeURIComponent(input.account_id)}/Contacts`,
            params: {
                fields: input.fields ?? DEFAULT_FIELDS,
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        if (response.status === 204) {
            return { contacts: [] };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const info = providerResponse.info;

        return {
            contacts: providerResponse.data ?? [],
            ...(info?.page != null && { page: info.page }),
            ...(info?.per_page != null && { per_page: info.per_page }),
            ...(info?.count != null && { count: info.count }),
            ...(info?.more_records != null && { more_records: info.more_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
