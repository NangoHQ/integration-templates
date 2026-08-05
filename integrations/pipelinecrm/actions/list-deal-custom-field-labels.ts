import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    pages: z.number().optional()
});

const ProviderDropdownEntrySchema = z.object({
    id: z.number(),
    custom_field_label_id: z.number(),
    account_id: z.number(),
    name: z.string(),
    position: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderLabelSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        custom_field_group_id: z.number().nullable().optional(),
        field_type: z.string(),
        position: z.number().optional(),
        record_type: z.string().optional(),
        report_behavior: z.string().nullable().optional(),
        type: z.string().optional(),
        is_required: z.boolean().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        output_type: z.string().optional(),
        custom_field_label_dropdown_entries: z.array(ProviderDropdownEntrySchema).optional(),
        locked: z.boolean().optional(),
        custom_field_permissions: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderLabelSchema),
    pagination: ProviderPaginationSchema
});

const DropdownEntrySchema = z.object({
    id: z.number(),
    custom_field_label_id: z.number(),
    account_id: z.number(),
    name: z.string(),
    position: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const LabelSchema = z.object({
    id: z.number(),
    name: z.string(),
    field_type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    custom_field_group_id: z.number().optional(),
    position: z.number().optional(),
    record_type: z.string().optional(),
    report_behavior: z.string().optional(),
    type: z.string().optional(),
    is_required: z.boolean().optional(),
    output_type: z.string().optional(),
    custom_field_label_dropdown_entries: z.array(DropdownEntrySchema).optional(),
    locked: z.boolean().optional(),
    custom_field_permissions: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(LabelSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List individual custom field definitions available on deals.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        // https://app.pipelinecrm.com/openapi.yaml
        const response = await nango.get({
            endpoint: '/api/v3/admin/deal_custom_field_labels',
            params: {
                page: page,
                per_page: 200
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            field_type: entry.field_type,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            ...(entry.custom_field_group_id != null && { custom_field_group_id: entry.custom_field_group_id }),
            ...(entry.position != null && { position: entry.position }),
            ...(entry.record_type != null && { record_type: entry.record_type }),
            ...(entry.report_behavior != null && { report_behavior: entry.report_behavior }),
            ...(entry.type != null && { type: entry.type }),
            ...(entry.is_required != null && { is_required: entry.is_required }),
            ...(entry.output_type != null && { output_type: entry.output_type }),
            ...(entry.custom_field_label_dropdown_entries != null && { custom_field_label_dropdown_entries: entry.custom_field_label_dropdown_entries }),
            ...(entry.locked != null && { locked: entry.locked }),
            ...(entry.custom_field_permissions != null && { custom_field_permissions: entry.custom_field_permissions })
        }));

        const hasMore = providerResponse.pagination.page * providerResponse.pagination.per_page < providerResponse.pagination.total;
        const next_cursor = hasMore ? String(providerResponse.pagination.page + 1) : undefined;

        return {
            items,
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
