import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    schemaId: z.string().describe('Schema ID. Example: "osc14u78ldxtbv6BP698"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        $schema: z.string().optional(),
        name: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        definitions: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve the JSON schema for a user type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.schemas.read'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/schemas/
            endpoint: `/api/v1/meta/schemas/user/${encodeURIComponent(input.schemaId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Schema not found',
                schemaId: input.schemaId
            });
        }

        const schema = OutputSchema.parse(response.data);

        return schema;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
