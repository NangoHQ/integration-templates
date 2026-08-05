import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Document ID. Example: "192568972"')
});

const OwnerSchema = z
    .object({
        id: z.number().optional(),
        full_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
    })
    .passthrough();

const PersonSchema = z
    .object({
        id: z.number().optional(),
        full_name: z.string().optional()
    })
    .passthrough();

const DealSchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional()
    })
    .passthrough();

const CompanySchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional()
    })
    .passthrough();

const CalendarEntrySchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional(),
        type: z.enum(['CalendarTask', 'CalendarEvent']).optional()
    })
    .passthrough();

const ProviderDocumentSchema = z
    .object({
        id: z.number(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        title: z.string().optional(),
        owner_id: z.number().optional(),
        owner_name: z.string().optional(),
        person_id: z.number().nullable().optional(),
        deal_id: z.number().nullable().optional(),
        company_id: z.number().nullable().optional(),
        calendar_entry_id: z.number().nullable().optional(),
        primary_association_id: z.number().nullable().optional(),
        primary_association_type: z.enum(['Deal', 'Person', 'Company', 'CalendarTask', 'CalendarEvent']).nullable().optional(),
        url: z.string().optional(),
        document_type: z.string().optional(),
        size_in_k: z.number().nullable().optional(),
        owner: OwnerSchema.nullable().optional(),
        person: PersonSchema.nullable().optional(),
        deal: DealSchema.nullable().optional(),
        company: CompanySchema.nullable().optional(),
        calendar_entry: CalendarEntrySchema.nullable().optional(),
        etag: z.string().optional(),
        upload_status: z.number().nullable().optional(),
        upload_status_error_message: z.string().nullable().optional(),
        upload_state: z.string().nullable().optional(),
        document_tag_ids: z.array(z.number()).optional(),
        document_tags: z.array(z.unknown()).optional(),
        public_link: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProviderDocumentSchema;

const action = createAction({
    description: 'Get a single document by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/documents/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Document not found',
                id: input.id
            });
        }

        const document = ProviderDocumentSchema.parse(response.data);

        return document;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
