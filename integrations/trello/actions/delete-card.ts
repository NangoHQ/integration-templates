import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the card to delete. Example: "6a26f3127128c2af2fd32b1b"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Permanently delete a Trello card.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-card',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-delete
            endpoint: `/1/cards/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Card with id "${input.id}" was not found.`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when attempting to delete the card.`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
