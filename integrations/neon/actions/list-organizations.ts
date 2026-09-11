import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: getCurrentUserOrganizations
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        organizations: z.array(
            z
                .object({
                    id: z.string(),
                    name: z.string(),
                    handle: z.string(),
                    plan: z.string(),
                    created_at: z.string(),
                    managed_by: z.string(),
                    updated_at: z.string(),
                    allow_hipaa_projects: z.boolean().optional(),
                    require_mfa: z.boolean().optional()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'List organizations for the current user. Retrieves the organizations that the currently authenticated user belongs to.\n\nWhen called with an organization- or project-scoped API key (which is not\ntied to a user), this returns the single organization that owns the key.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/users/me/organizations`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
