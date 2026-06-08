import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the label to retrieve. Example: "6a26f2ed8e7484b03cb90f9b"')
});

const ProviderLabelSchema = z
    .object({
        id: z.string(),
        idBoard: z.string(),
        name: z.string(),
        color: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    idBoard: z.string(),
    name: z.string(),
    color: z.string().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single label from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-labels/#api-labels-id-get
            endpoint: `/1/labels/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Label with id ${input.id} not found.`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when retrieving label ${input.id}.`
            });
        }

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            idBoard: providerLabel.idBoard,
            name: providerLabel.name,
            ...(providerLabel.color !== undefined && { color: providerLabel.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
