import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SchemaResourceSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        attributes: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    schemas: z.array(z.string()).optional(),
    totalResults: z.number().optional(),
    Resources: z.array(SchemaResourceSchema).optional()
});

const action = createAction({
    description: 'List SCIM schemas supported by the bridge.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-schemas',
        group: 'SCIM'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Schemas',
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            retries: 3
        });

        const listResponse = z
            .object({
                schemas: z.array(z.string()).optional(),
                totalResults: z.number().optional(),
                Resources: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const resources = listResponse.Resources;
        if (!resources) {
            return {
                schemas: listResponse.schemas,
                totalResults: listResponse.totalResults
            };
        }

        return {
            schemas: listResponse.schemas,
            totalResults: listResponse.totalResults,
            Resources: resources.map((resource) => SchemaResourceSchema.parse(resource))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
