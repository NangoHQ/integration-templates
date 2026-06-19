import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    card_id: z.string().describe('The ID of the card containing the comment. Example: "5abbe4b7ddc1b351ef961414"'),
    action_id: z.string().describe('The ID of the commentCard action to delete. Example: "5abbe4b7ddc1b351ef961414"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string().optional()
});

const action = createAction({
    description: 'Delete a comment from a Trello card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
        const response = await nango.delete({
            endpoint: `/1/cards/${encodeURIComponent(input.card_id)}/actions/${encodeURIComponent(input.action_id)}/comments`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const responseSchema = z
            .object({
                id: z.string().optional()
            })
            .passthrough();

        const parsed = responseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.id) {
            return {
                success: true,
                id: parsed.data.id
            };
        }

        return {
            success: true,
            id: input.action_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
