import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    omit_personal: z.boolean().optional().describe('Whether to exclude labels that are also personal labels.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of labels to return per page.')
});

const OutputSchema = z.object({
    results: z.array(z.string()),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List label names currently used across the user's tasks (not necessarily backed by a personal Label object).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-all-shared-labels
            endpoint: '/api/v1/labels/shared',
            params: {
                ...(input.omit_personal !== undefined && { omit_personal: input.omit_personal ? 'true' : 'false' }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const rawData = response.data;

        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Todoist API.'
            });
        }

        const results = Array.isArray(rawData.results) ? rawData.results : [];
        const nextCursor = rawData.next_cursor != null ? String(rawData.next_cursor) : undefined;

        return {
            results: results.filter((item: unknown): item is string => typeof item === 'string'),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
