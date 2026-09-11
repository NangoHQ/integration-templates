import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: listProjectBranchDatabases
const InputSchema = z.object({ project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')), branch_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')) });

const ProviderResponseSchema = z
    .object({
        databases: z.array(
            z
                .object({
                    id: z.number().int(),
                    branch_id: z.string(),
                    name: z.string(),
                    owner_name: z.string(),
                    created_at: z.string(),
                    updated_at: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List databases in Neon.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/branches/${encodeURIComponent(input['branch_id'])}/databases`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
