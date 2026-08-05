import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ListOutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: z.object({
        page: z.number(),
        pages: z.number(),
        per_page: z.number(),
        total: z.number()
    })
});

const action = createAction({
    description: 'List categories that can be assigned to a calendar entry (task or event).',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/event_categories',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);
        const entriesArray = raw.entries;
        const nextCursor = raw.pagination.page < raw.pagination.pages ? String(raw.pagination.page + 1) : undefined;

        const categories = entriesArray.map((item: unknown) => {
            const parsed = CategorySchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned an unexpected category shape.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return {
            categories,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
