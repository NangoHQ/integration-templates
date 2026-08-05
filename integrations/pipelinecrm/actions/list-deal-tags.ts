import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination page number from the previous response. Omit for the first page.')
});

const DealTagSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const PaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ListResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: PaginationSchema
});

const OutputSchema = z.object({
    items: z.array(DealTagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags available for tagging deals.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const params: Record<string, string> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/deal_tags',
            params,
            retries: 3
        });

        const listData = ListResponseSchema.parse(response.data);
        const entries = listData.entries;
        const pagination = listData.pagination;

        const items = entries.map((entry) => {
            const tag = DealTagSchema.parse(entry);
            return {
                id: tag.id,
                ...(tag.name !== undefined && { name: tag.name }),
                ...(tag.created_at !== undefined && { created_at: tag.created_at }),
                ...(tag.updated_at !== undefined && { updated_at: tag.updated_at })
            };
        });

        const nextCursor = pagination.page < pagination.pages ? String(pagination.page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
