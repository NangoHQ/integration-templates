import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const SchemaStubSchema = z.object({
    schemaId: z.string(),
    displayName: z.string().optional(),
    latestSchemaVersion: z.string().optional()
});

const ProviderSchemaListSchema = z.object({
    items: z.array(SchemaStubSchema).optional(),
    totalCount: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(SchemaStubSchema),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'List available Settings 2.0 schema IDs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/settings/schemas/get-schema-list
            endpoint: '/api/v2/settings/schemas',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderSchemaListSchema.parse(response.data);

        return {
            items: parsed.items ?? [],
            ...(parsed.totalCount !== undefined && { totalCount: parsed.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
