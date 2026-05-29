import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    name: z.string().optional().describe('The name of this organization. Example: "acme-corp"'),
    display_name: z.string().optional().describe('Friendly name of this organization. Example: "Acme Corporation"'),
    branding: z
        .object({
            logo_url: z.string().optional().describe('URL of logo to display on login page'),
            colors: z
                .object({
                    primary: z.string(),
                    page_background: z.string()
                })
                .optional()
        })
        .optional(),
    metadata: z
        .record(z.string(), z.string().or(z.null()))
        .optional()
        .describe('Metadata associated with the organization (max 25 properties, string values up to 255 chars)'),
    token_quota: z
        .object({
            client_credentials: z.object({
                enforce: z.boolean().optional(),
                per_day: z.number().optional(),
                per_hour: z.number().optional()
            })
        })
        .optional()
});

const OrganizationBrandingSchema = z
    .object({
        logo_url: z.string().optional(),
        colors: z
            .object({
                primary: z.string(),
                page_background: z.string()
            })
            .optional()
    })
    .optional();

const OrganizationMetadataSchema = z.record(z.string(), z.string().or(z.null())).optional();

const TokenQuotaSchema = z
    .object({
        client_credentials: z.object({
            enforce: z.boolean().optional(),
            per_day: z.number().optional(),
            per_hour: z.number().optional()
        })
    })
    .optional();

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    branding: OrganizationBrandingSchema,
    metadata: OrganizationMetadataSchema,
    token_quota: TokenQuotaSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    branding: OrganizationBrandingSchema,
    metadata: OrganizationMetadataSchema,
    token_quota: TokenQuotaSchema
});

const action = createAction({
    description: 'Update an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://auth0.com/docs/api/management/v2/organizations/patch-organizations-by-id
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.branding !== undefined && { branding: input.branding }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.token_quota !== undefined && { token_quota: input.token_quota })
            },
            retries: 10
        });

        const providerOrganization = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrganization.id,
            ...(providerOrganization.name !== undefined && { name: providerOrganization.name }),
            ...(providerOrganization.display_name !== undefined && { display_name: providerOrganization.display_name }),
            ...(providerOrganization.branding !== undefined && { branding: providerOrganization.branding }),
            ...(providerOrganization.metadata !== undefined && { metadata: providerOrganization.metadata }),
            ...(providerOrganization.token_quota !== undefined && { token_quota: providerOrganization.token_quota })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
