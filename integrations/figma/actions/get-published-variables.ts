import { z } from 'zod';
import { createAction } from 'nango';

const VariableResolvedDataTypeSchema = z.enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']);

const PublishedVariableSchema = z.object({
    id: z.string(),
    subscribed_id: z.string(),
    name: z.string(),
    key: z.string(),
    variableCollectionId: z.string(),
    resolvedDataType: VariableResolvedDataTypeSchema,
    updatedAt: z.string()
});

const PublishedVariableCollectionSchema = z.object({
    id: z.string(),
    subscribed_id: z.string(),
    name: z.string(),
    key: z.string(),
    updatedAt: z.string()
});

const InputSchema = z.object({
    file_key: z.string().describe('Figma file key to retrieve published variables from. Example: "UzYlOaPNPL2c7zmHCEljOs"')
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z.object({
        variables: z.record(z.string(), PublishedVariableSchema),
        variableCollections: z.record(z.string(), PublishedVariableCollectionSchema)
    })
});

const action = createAction({
    description: 'Retrieve all published variables for a Figma file.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_variables:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.figma.com/docs/rest-api/variables-endpoints/
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/variables/published`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
