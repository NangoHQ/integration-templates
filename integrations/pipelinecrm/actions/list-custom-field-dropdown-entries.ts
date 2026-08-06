import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Example: 1')
});

const PaginationSchema = z.object({
    page: z.number().optional(),
    pages: z.number().optional(),
    total: z.number().optional(),
    per_page: z.number().optional(),
    page_var: z.string().optional()
});

const ProviderDropdownEntrySchema = z
    .object({
        id: z.number(),
        custom_field_label_id: z.number(),
        name: z.string(),
        position: z.number().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    entries: z.array(ProviderDropdownEntrySchema).optional(),
    pagination: PaginationSchema.optional()
});

const OutputEntrySchema = z.object({
    id: z.number(),
    custom_field_label_id: z.number(),
    name: z.string(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    entries: z.array(OutputEntrySchema),
    pagination: PaginationSchema.optional()
});

const action = createAction({
    description: 'List the picklist option values for dropdown-type custom fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/custom_field_label_dropdown_entries',
            params: {
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const entries = (providerResponse.entries || []).map((entry) => ({
            id: entry.id,
            custom_field_label_id: entry.custom_field_label_id,
            name: entry.name,
            ...(entry.position != null && { position: entry.position }),
            ...(entry.created_at != null && { created_at: entry.created_at }),
            ...(entry.updated_at != null && { updated_at: entry.updated_at })
        }));

        return {
            entries,
            ...(providerResponse.pagination !== undefined && {
                pagination: providerResponse.pagination
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
