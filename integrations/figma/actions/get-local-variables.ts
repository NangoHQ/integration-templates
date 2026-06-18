import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The key of the Figma file. Example: "UzYlOaPNPL2c7zmHCEljOs"')
});

const ModeSchema = z
    .object({
        name: z.string(),
        modeId: z.string()
    })
    .passthrough();

const VariableCollectionSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        hiddenFromPublishing: z.boolean().optional(),
        key: z.string().optional(),
        defaultModeId: z.string().optional(),
        modes: z.array(ModeSchema).optional(),
        remote: z.boolean().optional(),
        variableIds: z.array(z.string()).optional(),
        localVariableIds: z.array(z.string()).optional()
    })
    .passthrough();

const VariableSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        variableCollectionId: z.string().optional(),
        key: z.string().optional(),
        remote: z.boolean().optional(),
        resolvedType: z.string().optional(),
        valuesByMode: z.record(z.string(), z.unknown()).optional(),
        scopes: z.array(z.string()).optional(),
        hiddenFromPublishing: z.boolean().optional(),
        codeSyntax: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        status: z.number(),
        error: z.boolean(),
        meta: z.object({
            variableCollections: z.record(z.string(), VariableCollectionSchema),
            variables: z.record(z.string(), VariableSchema)
        })
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve all local variables defined in a Figma file.',
    version: '1.0.1',
    input: InputSchema,
    output: ProviderResponseSchema,
    scopes: ['file_variables:read'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderResponseSchema>> => {
        // https://www.figma.com/developers/api#get-local-variables-endpoint
        const response = await nango.get({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/variables/local`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No data returned for local variables.'
            });
        }

        const data = ProviderResponseSchema.parse(response.data);

        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
