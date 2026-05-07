import { z } from 'zod';
import { createAction } from 'nango';

const QueryConditionSchema = z.object({
    field: z.string().describe('Field name to filter on. Example: "updated_at"'),
    operator: z.enum(['=', '!=', '>', '<', '~', '!~', 'IN', 'NIN', 'AND', 'OR']).describe('Comparison operator.'),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any())]).describe('Value to compare against.')
});

const InputSchema = z.object({
    query: QueryConditionSchema.optional().describe('Search query with field, operator, and value.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (pages.next.starting_after). Omit for the first page.'),
    per_page: z.number().int().min(1).max(150).optional().describe('Number of results per page (max 150).')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'lead']),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    user_id: z.string().nullable().optional()
});

const ProviderPagesSchema = z.object({
    next: z
        .object({
            starting_after: z.string()
        })
        .optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderContactSchema),
    pages: ProviderPagesSchema.optional()
});

const ContactSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'lead']),
    email: z.string().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    user_id: z.string().optional()
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search contacts with a structured filter query.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.query) {
            requestBody['query'] = input.query;
        }

        const pagination: Record<string, unknown> = {};

        if (input.per_page !== undefined) {
            pagination['per_page'] = input.per_page;
        }

        if (input.cursor) {
            pagination['starting_after'] = input.cursor;
        }

        if (Object.keys(pagination).length > 0) {
            requestBody['pagination'] = pagination;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts
        const response = await nango.post({
            endpoint: '/contacts/search',
            data: requestBody,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const contacts = parsed.data.map((contact) => ({
            id: contact.id,
            role: contact.role,
            ...(contact.email !== null && contact.email !== undefined && { email: contact.email }),
            ...(contact.phone !== null && contact.phone !== undefined && { phone: contact.phone }),
            ...(contact.name !== null && contact.name !== undefined && { name: contact.name }),
            ...(contact.created_at !== undefined && { created_at: contact.created_at }),
            ...(contact.updated_at !== undefined && { updated_at: contact.updated_at }),
            ...(contact.user_id !== null && contact.user_id !== undefined && { user_id: contact.user_id })
        }));

        return {
            contacts,
            ...(parsed.pages?.next?.starting_after !== undefined && {
                next_cursor: parsed.pages.next.starting_after
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
