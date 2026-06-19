import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    boardId: z.string().describe('Board ID. Example: "6a26ebb3cd5f60a53a585978"'),
    limit: z.number().min(1).max(1000).optional().describe('Maximum number of labels to return. Max 1000.')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    idBoard: z.string().optional(),
    name: z.string().nullable().optional(),
    color: z.string().nullable().optional()
});

const OutputSchema = z.object({
    labels: z.array(ProviderLabelSchema)
});

const action = createAction({
    description: 'List labels on a Trello board.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-labels-get
            endpoint: `/1/boards/${encodeURIComponent(input.boardId)}/labels`,
            params: {
                limit: String(input.limit ?? 1000)
            },
            retries: 3
        });

        const parsed = z.array(ProviderLabelSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse labels from Trello API',
                details: parsed.error.issues
            });
        }

        return {
            labels: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
