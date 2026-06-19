import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the checklist to delete. Example: "6a26f33578a03d1e69753e61"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a Trello checklist.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-delete
            endpoint: `/1/checklists/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Checklist with id "${input.id}" was not found.`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when attempting to delete the checklist.`
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
