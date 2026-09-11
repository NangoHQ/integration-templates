import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: listSnapshots
const InputSchema = z.object({ project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon project ID') });

const ProviderResponseSchema = z
    .object({
        snapshots: z.array(
            z
                .object({
                    id: z.string(),
                    name: z.string(),
                    lsn: z.string().optional(),
                    timestamp: z.string().optional(),
                    source_branch_id: z.string().optional(),
                    created_at: z.string(),
                    expires_at: z.string().optional(),
                    manual: z.boolean().optional(),
                    full_size: z.number().int().optional(),
                    diff_size: z.number().int().optional()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'List project snapshots. Lists the snapshots for the specified project.\nEach snapshot represents a point-in-time backup of the project data.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/snapshots`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
