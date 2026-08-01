import { z } from 'zod';
import { createAction } from 'nango';

const DatasetExecuteQueriesErrorSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional()
});

const DatasetExecuteQueriesTableResultSchema = z.object({
    error: DatasetExecuteQueriesErrorSchema.optional(),
    rows: z.array(z.record(z.string(), z.unknown())).optional()
});

const DatasetExecuteQueriesQueryResultSchema = z.object({
    error: DatasetExecuteQueriesErrorSchema.optional(),
    tables: z.array(DatasetExecuteQueriesTableResultSchema).optional()
});

const DatasetExecuteQueriesInformationProtectionLabelSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace ID (group ID). Example: 149ca924-4333-471b-94b5-347eca3f9938'),
    datasetId: z.string().describe('Dataset ID. Example: a71c1b98-a0db-4423-a81b-5dcb48d5c8d1'),
    queries: z
        .array(z.string())
        .length(1)
        .describe('Exactly one DAX query to execute (the provider API supports only one query per call). Example: ["EVALUATE SalesFact"]'),
    impersonatedUserName: z.string().optional().describe('UPN of a user to be impersonated'),
    serializerSettings: z
        .object({
            includeNulls: z.boolean().optional()
        })
        .optional()
        .describe('Serialization settings for the result set')
});

const OutputSchema = z
    .object({
        error: DatasetExecuteQueriesErrorSchema.optional(),
        informationProtectionLabel: DatasetExecuteQueriesInformationProtectionLabelSchema.optional(),
        results: z.array(DatasetExecuteQueriesQueryResultSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Run a DAX query against a dataset and return the results',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}/datasets/${encodeURIComponent(input.datasetId)}/executeQueries`,
            data: {
                queries: input.queries.map((query) => ({ query })),
                ...(input.impersonatedUserName !== undefined && { impersonatedUserName: input.impersonatedUserName }),
                ...(input.serializerSettings !== undefined && { serializerSettings: input.serializerSettings })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
