import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Maximum 200.'),
    deal_id: z.number().optional().describe('Filter by associated deal ID.'),
    person_id: z.number().optional().describe('Filter by associated person ID.'),
    company_id: z.number().optional().describe('Filter by associated company ID.'),
    calendar_entry_id: z.number().optional().describe('Filter by associated calendar entry ID.')
});

const OwnerSchema = z.object({
    id: z.number(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
});

const DealSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const CompanySchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const PersonSchema = z.object({
    id: z.number(),
    full_name: z.string().optional()
});

const CalendarEntrySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional()
});

const DocumentSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    url: z.string().optional(),
    public_link: z.string().optional(),
    size_in_k: z.number().optional(),
    owner_id: z.number().optional(),
    person_id: z.number().nullable().optional(),
    deal_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    calendar_entry_id: z.number().nullable().optional(),
    document_type: z.string().optional(),
    upload_state: z.string().optional(),
    upload_status: z.number().optional(),
    upload_status_error_message: z.string().nullable().optional(),
    etag: z.string().optional(),
    document_tag_ids: z.array(z.number()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    owner_name: z.string().optional(),
    owner: OwnerSchema.nullable().optional(),
    deal: DealSchema.nullable().optional(),
    company: CompanySchema.nullable().optional(),
    person: PersonSchema.nullable().optional(),
    calendar_entry: CalendarEntrySchema.nullable().optional(),
    document_tags: z.array(z.unknown()).optional()
});

const ListResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: z
        .object({
            page: z.number(),
            per_page: z.number().optional(),
            total: z.number().optional(),
            pages: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(DocumentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List documents (called "Files" in the Pipeline CRM UI) attached to deals/people/companies/calendar entries.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const params: Record<string, string | number> = {
            page: page,
            per_page: input.per_page ?? 200
        };

        if (input.deal_id !== undefined) {
            params['deal_id'] = input.deal_id;
        }
        if (input.person_id !== undefined) {
            params['person_id'] = input.person_id;
        }
        if (input.company_id !== undefined) {
            params['company_id'] = input.company_id;
        }
        if (input.calendar_entry_id !== undefined) {
            params['calendar_entry_id'] = input.calendar_entry_id;
        }

        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.get({
            endpoint: '/api/v3/documents.json',
            params: params,
            retries: 3
        });

        const raw = ListResponseSchema.parse(response.data);
        const items = raw.entries.map((entry: unknown) => {
            const doc = DocumentSchema.parse(entry);
            return {
                id: doc.id,
                ...(doc.title !== undefined && { title: doc.title }),
                ...(doc.url !== undefined && { url: doc.url }),
                ...(doc.public_link !== undefined && { public_link: doc.public_link }),
                ...(doc.size_in_k !== undefined && { size_in_k: doc.size_in_k }),
                ...(doc.owner_id !== undefined && { owner_id: doc.owner_id }),
                ...(doc.person_id != null && { person_id: doc.person_id }),
                ...(doc.deal_id != null && { deal_id: doc.deal_id }),
                ...(doc.company_id != null && { company_id: doc.company_id }),
                ...(doc.calendar_entry_id != null && { calendar_entry_id: doc.calendar_entry_id }),
                ...(doc.document_type !== undefined && { document_type: doc.document_type }),
                ...(doc.upload_state !== undefined && { upload_state: doc.upload_state }),
                ...(doc.upload_status !== undefined && { upload_status: doc.upload_status }),
                ...(doc.upload_status_error_message != null && { upload_status_error_message: doc.upload_status_error_message }),
                ...(doc.etag !== undefined && { etag: doc.etag }),
                ...(doc.document_tag_ids !== undefined && { document_tag_ids: doc.document_tag_ids }),
                ...(doc.created_at !== undefined && { created_at: doc.created_at }),
                ...(doc.updated_at !== undefined && { updated_at: doc.updated_at }),
                ...(doc.owner_name !== undefined && { owner_name: doc.owner_name }),
                ...(doc.owner != null && { owner: doc.owner }),
                ...(doc.deal != null && { deal: doc.deal }),
                ...(doc.company != null && { company: doc.company }),
                ...(doc.person != null && { person: doc.person }),
                ...(doc.calendar_entry != null && { calendar_entry: doc.calendar_entry }),
                ...(doc.document_tags !== undefined && { document_tags: doc.document_tags })
            };
        });

        const currentPerPage = raw.pagination?.per_page ?? 200;
        const totalPages = raw.pagination?.pages;
        const hasMore = totalPages ? page < totalPages : raw.entries.length === currentPerPage;
        const nextCursor = hasMore ? String(page + 1) : undefined;

        return {
            items: items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
