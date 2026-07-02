import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataStructureId: z.number().describe('Data structure ID. Example: 477315'),
    name: z.string().optional(),
    strict: z.boolean().optional(),
    spec: z.array(z.object({}).passthrough()).optional()
});

const DataStructureFieldSchema = z
    .object({
        type: z.string(),
        name: z.string(),
        label: z.string().optional(),
        required: z.boolean().optional(),
        default: z.unknown().optional(),
        multiline: z.boolean().optional()
    })
    .passthrough();

const DataStructureSchema = z
    .object({
        id: z.number(),
        teamId: z.number(),
        name: z.string(),
        strict: z.boolean(),
        spec: z.array(DataStructureFieldSchema).optional()
    })
    .passthrough();

const OutputSchema = DataStructureSchema;

const ConnectionSchema = z
    .object({
        connection_config: z
            .object({
                environmentUrl: z.string()
            })
            .passthrough()
    })
    .passthrough();

const action = createAction({
    description: "Update a data structure's name or field spec.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data-structures:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.safeParse(connection);

        const patchConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/api-reference/data-structures.md
            endpoint: `/data-structures/${encodeURIComponent(input.dataStructureId)}`,
            data: {},
            retries: 10
        };

        if (parsedConnection.success) {
            patchConfig.baseUrlOverride = `https://${parsedConnection.data.connection_config.environmentUrl}/api/v2`;
        }

        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.strict !== undefined) {
            body['strict'] = input.strict;
        }
        if (input.spec !== undefined) {
            body['spec'] = input.spec;
        }

        patchConfig.data = body;

        const response = await nango.patch(patchConfig);

        const providerResponse = z
            .object({
                dataStructure: DataStructureSchema
            })
            .parse(response.data);

        return providerResponse.dataStructure;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
