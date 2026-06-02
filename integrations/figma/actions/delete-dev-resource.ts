import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The Figma file key to delete the dev resource from. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    dev_resource_id: z.string().describe('The ID of the dev resource to delete. Example: "1234567890"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a dev resource in Figma',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-dev-resource',
        group: 'Dev Resources'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_dev_resources:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { file_key, dev_resource_id } = input;

        // https://developers.figma.com/docs/rest-api/dev-resources-endpoints/
        await nango.delete({
            endpoint: `/v1/files/${encodeURIComponent(file_key)}/dev_resources/${encodeURIComponent(dev_resource_id)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
