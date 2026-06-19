import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The file to get dev resources from. This must be a main file key, not a branch key.'),
    node_ids: z
        .array(z.string())
        .optional()
        .describe('Optional list of node IDs to filter dev resources by. Only dev resources attached to these nodes will be returned.')
});

const DevResourceSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    file_key: z.string(),
    node_id: z.string()
});

const OutputSchema = z.object({
    dev_resources: z.array(DevResourceSchema)
});

const action = createAction({
    description: 'List dev resources linked to nodes in a Figma file.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_dev_resources:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.node_ids && input.node_ids.length > 0) {
            params['node_ids'] = input.node_ids.join(',');
        }

        const response = await nango.get({
            // https://developers.figma.com/docs/rest-api/dev-resources-endpoints/
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/dev_resources`,
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                dev_resources: z.array(DevResourceSchema).default([])
            })
            .parse(response.data);

        return {
            dev_resources: providerResponse.dev_resources
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
