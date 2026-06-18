import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    checklistId: z.string().describe('The ID of the checklist. Example: "6a26f332aa39a5f5b4c671bf"'),
    checkItemId: z.string().describe('The ID of the check item to delete. Example: "6a26f6348bb9f2f466b322ea"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an item from a Trello checklist.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-checkitems-idcheckitem-delete
            endpoint: `/1/checklists/${encodeURIComponent(input.checklistId)}/checkItems/${encodeURIComponent(input.checkItemId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Checklist item "${input.checkItemId}" not found in checklist "${input.checklistId}".`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when attempting to delete the checklist item.`
            });
        }

        return {
            id: input.checkItemId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
