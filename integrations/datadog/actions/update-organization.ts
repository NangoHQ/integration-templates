import { z } from 'zod';
import { createAction } from 'nango';

const SamlSettingsSchema = z.object({
    enabled: z.boolean().optional()
});

const SamlIdpInitiatedLoginSchema = z.object({
    enabled: z.boolean().optional()
});

const SamlStrictModeSchema = z.object({
    enabled: z.boolean().optional()
});

const SamlAutocreateUsersDomainsSchema = z.object({
    enabled: z.boolean().optional(),
    domains: z.array(z.string()).optional()
});

const OrganizationSettingsSchema = z.object({
    saml: SamlSettingsSchema.optional(),
    saml_idp_initiated_login: SamlIdpInitiatedLoginSchema.optional(),
    saml_strict_mode: SamlStrictModeSchema.optional(),
    saml_autocreate_users_domains: SamlAutocreateUsersDomainsSchema.optional(),
    saml_idp_endpoint: z.string().optional(),
    saml_login_url: z.string().optional(),
    private_widget_share: z.boolean().optional(),
    saml_autocreate_access_role: z.enum(['st', 'adm', 'ro']).optional()
});

const InputSchema = z.object({
    public_id: z.string().describe('The public_id of the organization you are operating within. Example: "abc123"'),
    name: z.string().max(32).optional().describe('The name of the organization, limited to 32 characters.'),
    billing: z
        .object({
            type: z.literal('parent_billing').optional().describe('The type of billing. Only `parent_billing` is supported.')
        })
        .optional()
        .describe('Billing configuration. Deprecated but retained for compatibility.'),
    subscription: z
        .object({
            type: z.enum(['trial', 'free', 'pro']).optional().describe('The subscription type. Types available are `trial`, `free`, and `pro`.')
        })
        .optional()
        .describe('Subscription configuration. Deprecated but retained for compatibility.'),
    settings: OrganizationSettingsSchema.optional().describe('Organization settings including SAML configuration.')
});

const ProviderOrganizationSchema = z.object({
    public_id: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    created: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    billing: z.record(z.string(), z.unknown()).optional(),
    subscription: z.record(z.string(), z.unknown()).optional()
});

const ProviderOrganizationResponseSchema = z.object({
    org: ProviderOrganizationSchema
});

const OutputSchema = z.object({
    public_id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    billing: z.record(z.string(), z.unknown()).optional(),
    subscription: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update organization settings (name, billing, SAML config).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.billing !== undefined) {
            body['billing'] = input.billing;
        }
        if (input.subscription !== undefined) {
            body['subscription'] = input.subscription;
        }
        if (input.settings !== undefined) {
            body['settings'] = input.settings;
        }

        // https://docs.datadoghq.com/api/latest/organizations/#update-your-organization
        const response = await nango.put({
            endpoint: `v1/org/${encodeURIComponent(input.public_id)}`,
            data: body,
            retries: 3
        });

        const parsed = ProviderOrganizationResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const org = parsed.data.org;

        return {
            public_id: org.public_id,
            ...(org.name !== undefined && { name: org.name }),
            ...(org.description != null && { description: org.description }),
            ...(org.created !== undefined && { created: org.created }),
            ...(org.settings !== undefined && { settings: org.settings }),
            ...(org.billing !== undefined && { billing: org.billing }),
            ...(org.subscription !== undefined && { subscription: org.subscription })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
