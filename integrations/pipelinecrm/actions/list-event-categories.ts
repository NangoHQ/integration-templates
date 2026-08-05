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

const action = createAction({
    description: 'List categories that can be assigned to a calendar entry (task or event).',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/event_categories',
            params,
            retries: 3
        });

        const raw = response.data;
        if (raw == null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an empty response.'
            });
        }

        const entriesArray = Array.isArray(raw.entries) ? raw.entries : [];
        const nextCursor = raw.pagination != null && typeof raw.pagination.next_cursor === 'string' ? raw.pagination.next_cursor : undefined;

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
