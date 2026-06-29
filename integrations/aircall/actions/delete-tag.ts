import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Unique identifier of the tag to delete. Example: 2733978')
});

const OutputSchema = z.object({
    id: z.number().describe('Unique identifier of the deleted tag.')
});

const action = createAction({
    description: 'Delete a tag in Aircall.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-tag'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#delete-a-tag
            endpoint: `/v1/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
