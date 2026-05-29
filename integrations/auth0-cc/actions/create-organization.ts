import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const BrandingColorsSchema = z.object({
    primary: z.string().describe('HEX Color for primary elements.'),
    page_background: z.string().describe('HEX Color for background.')
});

const BrandingSchema = z.object({
    logo_url: z.string().optional().describe('URL of logo to display on login page.'),
    colors: BrandingColorsSchema.optional()
});

const EnabledConnectionInputSchema = z.object({
    connection_id: z.string().describe('ID of the connection.'),
    assign_membership_on_login: z
        .boolean()
        .optional()
        .describe('When true, all users that log in with this connection will be automatically granted membership in the organization.'),
    show_as_button: z
        .boolean()
        .optional()
        .describe(
            "Determines whether a connection should be displayed on this organization's login prompt. Only applicable for enterprise connections. Default: true."
        ),
    is_signup_enabled: z
        .boolean()
        .optional()
        .describe(
            'Determines whether organization signup should be enabled for this organization connection. Only applicable for database connections. Default: false.'
        )
});

const InputSchema = z.object({
    name: z.string().min(1).max(50).describe('The name of this organization. Example: "acme-corp"'),
    display_name: z.string().min(1).max(255).optional().describe('Friendly name of this organization. Example: "Acme Corporation"'),
    branding: BrandingSchema.optional(),
    metadata: z
        .record(z.string(), z.nullable(z.string()))
        .refine((val) => Object.keys(val).length <= 25, { message: 'Maximum of 25 metadata properties allowed.' })
        .optional()
        .describe(
            'Metadata associated with the organization, in the form of an object with string values (max 255 chars). Maximum of 25 metadata properties allowed.'
        ),
    enabled_connections: z
        .array(EnabledConnectionInputSchema)
        .max(10)
        .optional()
        .describe('Connections that will be enabled for this organization. Max of 10 connections allowed.')
});

const ProviderConnectionSchema = z.object({
    name: z.string().optional(),
    strategy: z.string().optional()
});

const ProviderEnabledConnectionSchema = z.object({
    connection_id: z.string(),
    assign_membership_on_login: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    is_signup_enabled: z.boolean().optional(),
    connection: ProviderConnectionSchema.optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    branding: z
        .object({
            logo_url: z.nullable(z.string()).optional(),
            colors: z
                .object({
                    primary: z.string(),
                    page_background: z.string()
                })
                .optional()
        })
        .optional(),
    metadata: z.record(z.string(), z.nullable(z.string())).optional(),
    enabled_connections: z.array(ProviderEnabledConnectionSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    branding: z
        .object({
            logo_url: z.string().optional(),
            colors: z
                .object({
                    primary: z.string(),
                    page_background: z.string()
                })
                .optional()
        })
        .optional(),
    metadata: z.record(z.string(), z.nullable(z.string())).optional(),
    enabled_connections: z
        .array(
            z.object({
                connection_id: z.string(),
                assign_membership_on_login: z.boolean().optional(),
                show_as_button: z.boolean().optional(),
                is_signup_enabled: z.boolean().optional(),
                connection: z
                    .object({
                        name: z.string().optional(),
                        strategy: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

function normalizeBranding(branding: z.infer<typeof ProviderOrganizationSchema>['branding']): z.infer<typeof OutputSchema>['branding'] {
    if (branding === undefined) {
        return undefined;
    }
    return {
        ...(branding.logo_url !== undefined && { logo_url: branding.logo_url === null ? undefined : branding.logo_url }),
        ...(branding.colors !== undefined && { colors: branding.colors })
    };
}

const action = createAction({
    description: 'Create a organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/organizations/post-organizations
            endpoint: '/api/v2/organizations',
            data: {
                name: input.name,
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.branding !== undefined && { branding: input.branding }),
                ...(input['metadata'] !== undefined && { metadata: input['metadata'] }),
                ...(input.enabled_connections !== undefined && { enabled_connections: input.enabled_connections })
            },
            retries: 1
        };
        const response = await nango.post(config);

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id,
            name: providerOrg.name,
            ...(providerOrg.display_name !== undefined && { display_name: providerOrg.display_name }),
            ...(providerOrg.branding !== undefined && { branding: normalizeBranding(providerOrg.branding) }),
            ...(providerOrg['metadata'] !== undefined && { metadata: providerOrg['metadata'] }),
            ...(providerOrg.enabled_connections !== undefined && { enabled_connections: providerOrg.enabled_connections })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
