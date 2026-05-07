import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.string().describe('The Intercom company ID. Example: "5f1e5b5e5e5e5e5e5e5e5e5e"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(150).optional().describe('Number of results per page (max 150). Default: 50.')
});

const ContactSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.enum(['user', 'lead']),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    created_at: z.number(),
    updated_at: z.number()
});

const PagesSchema = z.object({
    type: z.string(),
    page: z.number(),
    per_page: z.number(),
    total_pages: z.number()
});

const ProviderResponseSchema = z.object({
    type: z.string(),
    data: z.array(ContactSchema),
    total_count: z.number(),
    pages: PagesSchema
});

const ContactOutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.enum(['user', 'lead']),
    email: z.string().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z.object({
    items: z.array(ContactOutputSchema),
    starting_after: z.string().optional()
});

const action = createAction({
    description: 'List contacts attached to a company.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-company-contacts',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/getCompaniesIdContacts
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'cursor must be a positive integer page number' });
        }
        const response = await nango.get({
            endpoint: `/companies/${encodeURIComponent(input.company_id)}/contacts`,
            params: {
                per_page: input.per_page || 50,
                page: page
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);
        const hasMore = data.pages.page < data.pages.total_pages;

        return {
            items: data.data.map((contact) => ({
                id: contact.id,
                type: contact.type,
                role: contact.role,
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                ...(contact.email && { email: contact.email }),
                ...(contact.phone && { phone: contact.phone }),
                ...(contact.name && { name: contact.name })
            })),
            ...(hasMore && { starting_after: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
