import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Label ID. Example: "6a26f31a38499a69b58916df"'),
    name: z.string().optional().describe('Name of the label.'),
    color: z.string().optional().describe('Color of the label.')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    color: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional()
});

const action = createAction({
    description: 'Update a Trello label.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-labels/#api-labels-id-put
            endpoint: `/1/labels/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.color !== undefined && { color: input.color })
            },
            retries: 3
        };

        const response = await nango.put(config);

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            ...(providerLabel.name != null && { name: providerLabel.name }),
            ...(providerLabel.color != null && { color: providerLabel.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
