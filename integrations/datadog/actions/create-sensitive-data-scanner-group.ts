import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the scanning group. Example: "Production Logs Scanner"'),
    is_enabled: z.boolean().optional().describe('Whether the group is enabled. Defaults to true.'),
    product_list: z.array(z.string()).describe('List of products to scan. Example: ["logs", "rum", "events", "apm"].'),
    filter_query: z.string().describe('Query filter for the scanning group. Example: "source:nango-registry-audit"'),
    config_id: z.string().describe('Sensitive Data Scanner configuration ID. Obtain from GET v2/sensitive-data-scanner/config.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z
        .object({
            name: z.string(),
            is_enabled: z.boolean(),
            product_list: z.array(z.string()),
            filter: z.object({ query: z.string() }).passthrough()
        })
        .passthrough(),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderGroupSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    is_enabled: z.boolean(),
    product_list: z.array(z.string()),
    filter_query: z.string()
});

const action = createAction({
    description: 'Create a new scanning group (a named collection of scanning rules with a shared filter)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/sensitive-data-scanner/#create-scanning-group
            endpoint: 'v2/sensitive-data-scanner/config/groups',
            data: {
                data: {
                    type: 'sensitive_data_scanner_group',
                    attributes: {
                        name: input.name,
                        is_enabled: input.is_enabled ?? true,
                        product_list: input.product_list,
                        filter: {
                            query: input.filter_query
                        }
                    },
                    relationships: {
                        configuration: {
                            data: {
                                id: input.config_id
                            }
                        }
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const group = providerResponse.data;

        return {
            id: group.id,
            name: group.attributes.name,
            is_enabled: group.attributes.is_enabled,
            product_list: group.attributes.product_list,
            filter_query: group.attributes.filter.query
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
