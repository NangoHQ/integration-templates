import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: getActiveRegions
const InputSchema = z.object({
    org_id: z
        .string()
        .regex(new RegExp('^[a-z0-9-]{1,60}$'))
        .describe('Organization ID. When provided, returns only regions available to this organization.\nRecommended for accurate region availability.\n')
        .optional()
});

const ProviderResponseSchema = z
    .object({
        regions: z.array(z.object({ region_id: z.string(), name: z.string(), default: z.boolean(), geo_lat: z.string(), geo_long: z.string() }).passthrough())
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'List supported regions. Lists supported Neon regions.\n\n**Note:** Not all regions are available to all organizations. Pass the `org_id`\nparameter to get an accurate list of regions available to your organization.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input['org_id'] !== undefined) params['org_id'] = input['org_id'];
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/regions`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
