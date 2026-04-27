import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_gid: z.string().describe('Globally unique identifier for the project. Example: "1205341234567890"')
});

const ProviderResponseSchema = z.object({
    data: z.object({})
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a project by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.asana.com/reference/deleteproject
            endpoint: `/api/1.0/projects/${input.project_gid}`,
            retries: 1
        });

        ProviderResponseSchema.parse(response.data);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
