import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: listProjectBranchRoles
const InputSchema = z.object({
    project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon project ID'),
    branch_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The branch ID')
});

const ProviderResponseSchema = z
    .object({
        roles: z.array(
            z
                .object({
                    branch_id: z.string(),
                    name: z.string(),
                    password: z.string().optional(),
                    protected: z.boolean().optional(),
                    authentication_method: z.string().optional(),
                    created_at: z.string(),
                    updated_at: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'List roles. Retrieves a list of Postgres roles from the specified branch.\nFor related information, see [Manage roles](https://neon.com/docs/manage/roles/).\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/branches/${encodeURIComponent(input['branch_id'])}/roles`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
