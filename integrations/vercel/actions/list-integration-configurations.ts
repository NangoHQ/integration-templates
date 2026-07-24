import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    view: z.enum(['account', 'project']).describe('The view scope for listing configurations. Example: "account"'),
    installationType: z.enum(['marketplace', 'external', 'provisioning']).optional().describe('Filter by installation type. Example: "marketplace"'),
    integrationIdOrSlug: z.string().optional().describe('Filter by integration ID or slug. Example: "my-integration"'),
    teamId: z.string().optional().describe('The Team identifier to perform the request on behalf of. Example: "team_123"'),
    slug: z.string().optional().describe('The Team slug to perform the request on behalf of. Example: "my-team"')
});

const IntegrationSchema = z
    .object({
        icon: z.string(),
        isLegacy: z.boolean(),
        name: z.string()
    })
    .passthrough();

const ConfigurationSchema = z
    .object({
        id: z.string(),
        integrationId: z.string(),
        ownerId: z.string(),
        slug: z.string(),
        type: z.literal('integration-configuration').optional(),
        userId: z.string(),
        createdAt: z.number(),
        updatedAt: z.number(),
        status: z.enum(['error', 'onboarding', 'pending', 'ready', 'resumed', 'suspended', 'uninstalled']).optional(),
        externalId: z.string().optional(),
        // Project IDs (e.g. "prj_..."); undefined means the configuration has full access to all projects.
        projects: z.array(z.string()).optional(),
        source: z.enum(['backoffice', 'cli', 'deploy-button', 'external', 'marketplace', 'oauth', 'resource-claims', 'v0']).optional(),
        teamId: z.string().nullable().optional(),
        // Permission-scope strings (e.g. "read:project", "read-write:log-drain").
        scopes: z.array(z.string()).optional(),
        completedAt: z.number().optional(),
        disabledAt: z.number().optional(),
        deletedAt: z.number().nullable().optional(),
        deleteRequestedAt: z.number().nullable().optional(),
        customerDeleteRequestedAt: z.number().nullable().optional(),
        disabledReason: z
            .enum([
                'account-plan-downgrade',
                'disabled-by-admin',
                'disabled-by-owner',
                'feature-not-available',
                'original-owner-left-the-team',
                'original-owner-role-downgraded'
            ])
            .optional(),
        installationType: z.enum(['external', 'marketplace']).optional(),
        integration: IntegrationSchema.optional()
    })
    .passthrough();

const OutputSchema = z.array(ConfigurationSchema);

const action = createAction({
    description: 'List installed Marketplace integration configurations metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/integrations/get-configurations-for-the-authenticated-user-or-team
            endpoint: '/v1/integrations/configurations',
            params: {
                view: input.view,
                ...(input.installationType !== undefined && { installationType: input.installationType }),
                ...(input.integrationIdOrSlug !== undefined && { integrationIdOrSlug: input.integrationIdOrSlug }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.slug !== undefined && { slug: input.slug })
            },
            retries: 3
        });

        const configurations = OutputSchema.parse(response.data);
        return configurations;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
