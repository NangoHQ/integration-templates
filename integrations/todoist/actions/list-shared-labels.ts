import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    omit_personal: z.boolean().optional().describe('Whether to exclude labels that are also personal labels.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of labels to return per page.')
});

const ProviderResponseSchema = z.object({
    results: z.array(z.string()),
    next_cursor: z.string().nullable().optional()
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
    scopes: ['data:read'],

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

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response failed schema validation',
                details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            });
        }

        return {
            results: parsed.data.results,
            ...(parsed.data.next_cursor != null && { next_cursor: parsed.data.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
