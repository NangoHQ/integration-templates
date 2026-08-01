import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const DatasourceConnectionDetailsSchema = z
    .object({
        account: z.string().optional(),
        classInfo: z.string().optional(),
        database: z.string().optional(),
        domain: z.string().optional(),
        emailAddress: z.string().optional(),
        kind: z.string().optional(),
        loginServer: z.string().optional(),
        path: z.string().optional(),
        server: z.string().optional(),
        url: z.string().optional()
    })
    .passthrough();

const DatasourceSchema = z
    .object({
        datasourceType: z.string(),
        datasourceId: z.string().optional(),
        gatewayId: z.string().optional(),
        connectionDetails: DatasourceConnectionDetailsSchema.optional(),
        connectionString: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    value: z.array(DatasourceSchema)
});

const action = createAction({
    description: 'List the data sources backing a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasources-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/datasources`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            value: z.array(z.unknown())
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            value: providerResponse.value.map((item) => DatasourceSchema.parse(item))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
