import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const DealCustomFieldGroupSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        position: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(DealCustomFieldGroupSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.union([
    z.object({
        entries: z.array(z.unknown()).default([]),
        pagination: z
            .object({
                page: z.number(),
                pages: z.number(),
                page_var: z.string().optional(),
                per_page: z.number().optional(),
                total: z.number().optional()
            })
            .optional()
            .nullable()
    }),
    z.array(z.unknown())
]);

const action = createAction({
    description: 'List custom field groups defined for deals.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/admin/deal_custom_field_groups',
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3',
            params: {
                page: page
            },
            retries: 3
        });

        const raw = ListResponseSchema.parse(response.data);
        const entries = Array.isArray(raw) ? raw : raw.entries;
        const pagination = Array.isArray(raw) ? undefined : raw.pagination;

        const items = entries.map((entry) => DealCustomFieldGroupSchema.parse(entry));

        const nextCursor = pagination && pagination.page < pagination.pages ? String(pagination.page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
