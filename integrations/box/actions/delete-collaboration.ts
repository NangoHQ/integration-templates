import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    collaboration_id: z.string().describe('The ID of the collaboration to delete. Example: "72837978884"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    collaboration_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a collaboration in Box',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-collaboration',
        group: 'Collaborations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/delete-collaborations-id/
        const response = await nango.delete({
            endpoint: `/2.0/collaborations/${input.collaboration_id}`,
            retries: 3
        });

        // Box returns 204 No Content on successful deletion
        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'deletion_failed',
                message: 'Failed to delete collaboration',
                status: response.status,
                collaboration_id: input.collaboration_id
            });
        }

        return {
            success: true,
            collaboration_id: input.collaboration_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
