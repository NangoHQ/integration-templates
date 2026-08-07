import { z } from 'zod';
import { createAction } from 'nango';

const LabelSchema = z.object({
    id: z.number(),
    name: z.string(),
    field_type: z.string(),
    position: z.number().nullable().optional(),
    record_type: z.string().nullable().optional(),
    is_required: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    custom_field_group_id: z.number().nullable().optional(),
    output_type: z.string().nullable().optional(),
    locked: z.boolean().nullable().optional(),
    type: z.string().nullable().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    labels: z.array(LabelSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: z.object({
        page: z.number(),
        pages: z.number(),
        per_page: z.number(),
        total: z.number()
    })
});

const action = createAction({
    description: 'List individual custom field definitions available on companies.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/company_custom_field_labels',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const list = ListResponseSchema.parse(response.data);

        const labels = list.entries.map((entry) => {
            const label = LabelSchema.parse(entry);
            return {
                id: label.id,
                name: label.name,
                field_type: label.field_type,
                ...(label.position !== undefined && label.position !== null && { position: label.position }),
                ...(label.record_type !== undefined && label.record_type !== null && { record_type: label.record_type }),
                ...(label.is_required !== undefined && label.is_required !== null && { is_required: label.is_required }),
                ...(label.created_at !== undefined && label.created_at !== null && { created_at: label.created_at }),
                ...(label.updated_at !== undefined && label.updated_at !== null && { updated_at: label.updated_at }),
                ...(label.custom_field_group_id !== undefined &&
                    label.custom_field_group_id !== null && { custom_field_group_id: label.custom_field_group_id }),
                ...(label.output_type !== undefined && label.output_type !== null && { output_type: label.output_type }),
                ...(label.locked !== undefined && label.locked !== null && { locked: label.locked }),
                ...(label.type !== undefined && label.type !== null && { type: label.type })
            };
        });

        const hasMore = list.pagination.page < list.pagination.pages;

        return {
            labels,
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
