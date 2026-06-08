import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the board to delete. Example: "6a26f2fbd1ccaa2cb9602757"')
});

const ProviderDeleteResponseSchema = z.object({
    _value: z.null().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a Trello board.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-board',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-delete
            endpoint: `/1/boards/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board with ID '${input.id}' not found or could not be deleted.`
            });
        }

        ProviderDeleteResponseSchema.parse(response.data);

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
