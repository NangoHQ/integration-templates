import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const DatasetUserSchema = z.object({
    datasetUserAccessRight: z.string().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    graphId: z.string().optional(),
    identifier: z.string(),
    principalType: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(DatasetUserSchema)
});

const action = createAction({
    description: 'List users and service principals with direct access to a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-dataset-users
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/users`,
            retries: 3
        };

        const response = await nango.get(config);

        const ProviderResponseSchema = z.object({
            value: z.array(DatasetUserSchema).optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            users: parsed.value ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
