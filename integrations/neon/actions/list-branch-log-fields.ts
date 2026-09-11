import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: listProjectBranchLogFields
const InputSchema = z.object({
    project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon project ID'),
    branch_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon branch ID')
});

const ProviderResponseSchema = z.object({ fields: z.array(z.string()) }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'List branch log fields. Lists the low-cardinality log fields observed on this branch whose\ndistinct values can be discovered with the log field-values endpoint.\n\nThe set is computed per branch and grows as new fields are observed, so\ntreat it as data rather than a fixed list: discover a field here, then\npass it as `field_name` to the field-values endpoint.\n\n**Note**: This endpoint is currently in Private Beta.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/branches/${encodeURIComponent(input['branch_id'])}/logs/fields`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
