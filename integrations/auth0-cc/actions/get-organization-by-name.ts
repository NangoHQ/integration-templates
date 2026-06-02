import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the organization to retrieve. Example: "acme-corp"')
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    branding: z
        .object({
            logo_url: z.string().nullable().optional(),
            colors: z.object({}).passthrough().optional()
        })
        .optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    token_quota: z
        .object({
            client_credentials: z.object({}).passthrough().optional()
        })
        .optional()
});

const OutputSchema = ProviderOrganizationSchema;

const action = createAction({
    description: 'Retrieve an organization by its name from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-organization-by-name',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/organizations/get-name-by-name
            endpoint: `/api/v2/organizations/name/${encodeURIComponent(input.name)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                name: input.name
            });
        }

        const organization = ProviderOrganizationSchema.parse(response.data);
        return organization;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
