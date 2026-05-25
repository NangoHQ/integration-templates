import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('The unique identifier of the group to delete. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the group was successfully deleted')
});

const action = createAction({
    description: 'Delete or archive a group in Microsoft',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/group-delete
        await nango.delete({
            endpoint: `/v1.0/groups/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
