import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Organization identifier. Example: "org_abc123"')
});

const OrganizationBrandingColorsSchema = z.object({
    primary: z.string(),
    page_background: z.string()
});

const OrganizationBrandingSchema = z.object({
    logo_url: z.string().optional(),
    colors: OrganizationBrandingColorsSchema.optional()
});

const TokenQuotaClientCredentialsSchema = z.object({
    enforce: z.boolean().optional(),
    per_day: z.number().optional(),
    per_hour: z.number().optional()
});

const TokenQuotaSchema = z.object({
    client_credentials: TokenQuotaClientCredentialsSchema
});

const ProviderOrganizationSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        display_name: z.string().optional(),
        branding: OrganizationBrandingSchema.optional(),
        metadata: z.record(z.string(), z.string().nullable()).optional(),
        token_quota: TokenQuotaSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    branding: OrganizationBrandingSchema.optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    token_quota: TokenQuotaSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single organization from Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/organizations/get-organizations-by-id
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                id: input.id
            });
        }

        const org = ProviderOrganizationSchema.parse(response.data);

        return {
            id: org.id,
            name: org.name,
            ...(org.display_name !== undefined && { display_name: org.display_name }),
            ...(org.branding !== undefined && { branding: org.branding }),
            ...(org.metadata !== undefined && { metadata: org.metadata }),
            ...(org.token_quota !== undefined && { token_quota: org.token_quota })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
