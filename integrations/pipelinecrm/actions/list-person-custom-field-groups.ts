import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: z
        .object({
            page: z.number(),
            pages: z.number().optional(),
            per_page: z.number(),
            total: z.number()
        })
        .optional()
});

const GroupSchema = z.object({
    id: z.number(),
    type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List custom field groups defined for people.',
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
            endpoint: '/api/v3/admin/person_custom_field_groups',
            params: {
                page: String(page)
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);
        const entries = providerResponse.entries.map((entry) => ProviderGroupSchema.parse(entry));
        const pagination = providerResponse.pagination;

        const nextCursor =
            pagination != null && (pagination.pages != null ? page < pagination.pages : page * pagination.per_page < pagination.total)
                ? String(page + 1)
                : undefined;

        return {
            items: entries,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
