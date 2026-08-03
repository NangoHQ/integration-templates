import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        configuredBy: z.string().optional(),
        isRefreshable: z.boolean().optional(),
        isEffectiveIdentityRequired: z.boolean().optional(),
        isOnPremGatewayRequired: z.boolean().optional(),
        targetStorageMode: z.string().optional(),
        createdDate: z.string().optional(),
        webUrl: z.string().optional(),
        addRowsAPIEnabled: z.boolean().optional(),
        contentProviderType: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get details of a single dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-dataset-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Dataset not found.',
                groupId: input.groupId,
                datasetId: input.datasetId
            });
        }

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Power BI API.',
                groupId: input.groupId,
                datasetId: input.datasetId
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
