import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        q_keywords: z.string().optional().describe('Keywords to narrow the search. Can include names, job titles, employers, and email addresses.'),
        contact_stage_ids: z.array(z.string()).optional().describe('Contact stage IDs to filter by.'),
        contact_label_ids: z.array(z.string()).optional().describe('Contact label IDs to filter by.'),
        sort_by_field: z
            .enum(['contact_last_activity_date', 'contact_email_last_opened_at', 'contact_email_last_clicked_at', 'contact_created_at', 'contact_updated_at'])
            .optional()
            .describe('Field to sort results by.'),
        sort_ascending: z.boolean().optional().describe('Sort in ascending order. Requires sort_by_field.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100).'),
        page: z.number().int().min(1).optional().describe('Page number to retrieve.')
    })
    .refine((data) => !data.sort_ascending || data.sort_by_field !== undefined, {
        message: 'sort_by_field is required when sort_ascending is set',
        path: ['sort_ascending']
    });

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total_entries: z.number(),
    total_pages: z.number()
});

const ContactSchema = z
    .object({
        id: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        organization_name: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    contacts: z.array(ContactSchema),
    pagination: PaginationSchema
});

const ContactOutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    organization_name: z.string().optional(),
    title: z.string().optional(),
    phone: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    contacts: z.array(ContactOutputSchema),
    pagination: z.object({
        page: z.number(),
        per_page: z.number(),
        total_entries: z.number(),
        total_pages: z.number(),
        next_cursor: z.string().optional().describe('Cursor for the next page. Omit if on the last page.')
    })
});

const action = createAction({
    description: 'List contacts from Apollo.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : input.page;
        // https://docs.apollo.io/reference/search-for-contacts
        const response = await nango.post({
            endpoint: '/v1/contacts/search',
            data: {
                ...(input.q_keywords !== undefined && { q_keywords: input.q_keywords }),
                ...(input.contact_stage_ids !== undefined && { contact_stage_ids: input.contact_stage_ids }),
                ...(input.contact_label_ids !== undefined && { contact_label_ids: input.contact_label_ids }),
                ...(input.sort_by_field !== undefined && { sort_by_field: input.sort_by_field }),
                ...(input.sort_ascending !== undefined && { sort_ascending: input.sort_ascending }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(page !== undefined && { page })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const hasNextPage = parsed.pagination.page < parsed.pagination.total_pages;

        return {
            contacts: parsed.contacts.map((contact) => ({
                id: contact.id,
                ...(contact.first_name !== undefined && { first_name: contact.first_name }),
                ...(contact.last_name !== undefined && { last_name: contact.last_name }),
                ...(contact.name !== undefined && { name: contact.name }),
                ...(contact.email !== undefined && { email: contact.email }),
                ...(contact.organization_name !== undefined && { organization_name: contact.organization_name }),
                ...(contact.title !== undefined && { title: contact.title }),
                ...(contact.phone !== undefined && { phone: contact.phone }),
                ...(contact.created_at !== undefined && { created_at: contact.created_at }),
                ...(contact.updated_at !== undefined && { updated_at: contact.updated_at })
            })),
            pagination: {
                page: parsed.pagination.page,
                per_page: parsed.pagination.per_page,
                total_entries: parsed.pagination.total_entries,
                total_pages: parsed.pagination.total_pages,
                ...(hasNextPage && { next_cursor: String(parsed.pagination.page + 1) })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
