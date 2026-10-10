import { z } from 'zod';
import { createAction } from 'nango';

const ContactSchema = z.looseObject({
    id: z.string().describe('Unique Bigin contact record ID. Example: "7255024000000596045"'),
    First_Name: z.string().nullable().optional().describe('First name of the contact.'),
    Last_Name: z.string().nullable().optional().describe('Last name of the contact.'),
    Full_Name: z.string().nullable().optional().describe('Full display name of the contact.'),
    Email: z.string().nullable().optional().describe('Email address of the contact.'),
    Phone: z.string().nullable().optional().describe('Work phone number of the contact.'),
    Mobile: z.string().nullable().optional().describe('Mobile phone number of the contact.'),
    Title: z.string().nullable().optional().describe('Job title of the contact.'),
    Account_Name: z
        .looseObject({
            name: z.string().nullable().optional().describe('Name of the linked company.'),
            id: z.string().nullable().optional().describe('ID of the linked company.')
        })
        .nullable()
        .optional()
        .describe('Company (Accounts record) linked to this contact, or null when no company is linked.'),
    Created_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was created.'),
    Modified_Time: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was last modified.')
});

const InfoSchema = z.object({
    per_page: z.number().optional(),
    page: z.number().optional(),
    count: z.number().optional(),
    sort_by: z.string().nullable().optional(),
    sort_order: z.string().nullable().optional(),
    next_page_token: z.string().nullable().optional(),
    previous_page_token: z.string().nullable().optional(),
    page_token_expiry: z.string().nullable().optional(),
    more_records: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ContactSchema),
    info: InfoSchema.optional()
});

const InputSchema = z
    .object({
        fields: z
            .array(z.string())
            .min(1)
            .max(50)
            .optional()
            .describe('Field API names to return, up to 50 (e.g. ["Last_Name", "Email"]). Defaults to id, First_Name, Last_Name, Email.'),
        page: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Page index to fetch, starting at 1. Only reaches the first 2000 records; use page_token beyond that.'),
        per_page: z
            .number()
            .int()
            .min(1)
            .max(200)
            .optional()
            .describe('Records per page, from 1 to 200. Defaults to 200. Ignored with page_token, which encodes its page size.'),
        page_token: z.string().optional().describe('Pagination token from a previous response next_page_token, used to page beyond the first 2000 records.'),
        sort_by: z.string().optional().describe('Field API name to sort results by. Example: "Created_Time".'),
        sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction, either "asc" or "desc". Applied together with sort_by.'),
        approved: z.enum(['true', 'false', 'both']).optional().describe('Filter by approval status: "true" (default), "false", or "both" for all records.'),
        cvid: z.string().optional().describe('Custom view ID to list records from, obtained from the custom views metadata API.')
    })
    .describe('Filters and pagination options for listing Bigin contacts.');

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts matching the request; empty when there are zero matching records.'),
        count: z.number().optional().describe('Number of contacts returned in this page.'),
        page: z.number().optional().describe('Current page index.'),
        per_page: z.number().optional().describe('Number of contacts per page.'),
        more_records: z.boolean().optional().describe('Whether more records are available beyond this page.'),
        next_page_token: z.string().optional().describe('Token to pass as page_token to fetch the next set of records.'),
        previous_page_token: z.string().optional().describe('Token for the previous page, when one exists.'),
        page_token_expiry: z.string().optional().describe('ISO 8601 timestamp when the page tokens expire.')
    })
    .describe('A page of Bigin contacts with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists contacts from the provider without creating, updating, or deleting any records.
 * @pitfalls: Results default to approved contacts only, so unapproved ones are excluded unless approved is "false" or "both"; zero matching contacts yield an empty "contacts" array rather than an error; page/per_page only reaches the first 2000 records (use page_token beyond that), page and page_token cannot be combined, and fields accepts at most 50 field names.
 */
const action = createAction({
    description: 'List contacts (people) in the Bigin org, paginated.',
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

        const fields = input.fields ?? ['id', 'First_Name', 'Last_Name', 'Email'];

        const params: Record<string, string | number> = {
            fields: fields.join(',')
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
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }
        if (input.approved !== undefined) {
            params['approved'] = input.approved;
        }
        if (input.cvid !== undefined) {
            params['cvid'] = input.cvid;
        }

        // https://www.bigin.com/developer/docs/apis/v2/get-records.html
        const response = await nango.get<unknown>({
            endpoint: '/bigin/v2/Contacts',
            params,
            retries: 3
        });

        if (response.status === 204 || response.data === '' || response.data === null || response.data === undefined) {
            return { contacts: [] };
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const info = parsed.info;

        return {
            contacts: parsed.data,
            ...(info?.count !== undefined && { count: info.count }),
            ...(info?.page !== undefined && { page: info.page }),
            ...(info?.per_page !== undefined && { per_page: info.per_page }),
            ...(info?.more_records !== undefined && { more_records: info.more_records }),
            ...(info?.next_page_token != null && { next_page_token: info.next_page_token }),
            ...(info?.previous_page_token != null && { previous_page_token: info.previous_page_token }),
            ...(info?.page_token_expiry != null && { page_token_expiry: info.page_token_expiry })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
