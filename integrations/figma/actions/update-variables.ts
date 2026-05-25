import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const VariableCollectionChangeSchema = z.object({
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    id: z.string().optional(),
    name: z.string().optional(),
    parentVariableCollectionId: z.string().optional(),
    initialModeId: z.string().optional(),
    initialModeIdToParentModeIdMapping: z.record(z.string(), z.string()).optional(),
    hiddenFromPublishing: z.boolean().optional()
});

const VariableModeChangeSchema = z.object({
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    id: z.string().optional(),
    name: z.string().optional(),
    variableCollectionId: z.string()
});

const VariableChangeSchema = z.object({
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    id: z.string().optional(),
    name: z.string().optional(),
    variableCollectionId: z.string().optional(),
    resolvedType: z.enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']).optional(),
    description: z.string().optional(),
    hiddenFromPublishing: z.boolean().optional(),
    scopes: z.array(z.string()).optional(),
    codeSyntax: z.record(z.string(), z.string()).optional()
});

const ColorSchema = z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    a: z.number().optional()
});

const VariableAliasSchema = z.object({
    type: z.literal('VARIABLE_ALIAS'),
    id: z.string()
});

const VariableModeValueSchema = z.object({
    variableId: z.string(),
    modeId: z.string(),
    value: z.union([z.boolean(), z.number(), z.string(), ColorSchema, VariableAliasSchema, z.null()])
});

const InputSchema = z.object({
    file_key: z.string().describe('File key or branch key. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    variableCollections: z.array(VariableCollectionChangeSchema).optional(),
    variableModes: z.array(VariableModeChangeSchema).optional(),
    variables: z.array(VariableChangeSchema).optional(),
    variableModeValues: z.array(VariableModeValueSchema).optional()
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z
        .object({
            tempIdToRealId: z.record(z.string(), z.string()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create, update, or delete variables and variable collections in a Figma file',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-variables',
        group: 'Variables'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_variables:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.figma.com/docs/rest-api/variables-endpoints/#post-variables-endpoint
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/variables`,
            data: {
                ...(input.variableCollections !== undefined && { variableCollections: input.variableCollections }),
                ...(input.variableModes !== undefined && { variableModes: input.variableModes }),
                ...(input.variables !== undefined && { variables: input.variables }),
                ...(input.variableModeValues !== undefined && { variableModeValues: input.variableModeValues })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = z
            .object({
                status: z.number(),
                error: z.boolean(),
                meta: z
                    .object({
                        tempIdToRealId: z.record(z.string(), z.string()).optional()
                    })
                    .optional()
            })
            .parse(response.data);

        return {
            status: providerResponse.status,
            error: providerResponse.error,
            ...(providerResponse.meta !== undefined && { meta: providerResponse.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
