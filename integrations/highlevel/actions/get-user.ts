import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "x0LnHeRRfAoGcMLwipcj"')
});

const ProviderRoleSchema = z.object({
    type: z.string().optional(),
    role: z.string().optional(),
    locationIds: z.array(z.string()).optional(),
    restrictSubAccount: z.boolean().optional()
});

const ProviderPermissionsSchema = z.object({
    campaignsEnabled: z.boolean().optional(),
    campaignsReadOnly: z.boolean().optional(),
    contactsEnabled: z.boolean().optional(),
    workflowsEnabled: z.boolean().optional(),
    workflowsReadOnly: z.boolean().optional(),
    triggersEnabled: z.boolean().optional(),
    funnelsEnabled: z.boolean().optional(),
    websitesEnabled: z.boolean().optional(),
    opportunitiesEnabled: z.boolean().optional(),
    dashboardStatsEnabled: z.boolean().optional(),
    bulkRequestsEnabled: z.boolean().optional(),
    appointmentsEnabled: z.boolean().optional(),
    reviewsEnabled: z.boolean().optional(),
    onlineListingsEnabled: z.boolean().optional(),
    phoneCallEnabled: z.boolean().optional(),
    conversationsEnabled: z.boolean().optional(),
    assignedDataOnly: z.boolean().optional(),
    adwordsReportingEnabled: z.boolean().optional(),
    membershipEnabled: z.boolean().optional(),
    facebookAdsReportingEnabled: z.boolean().optional(),
    attributionsReportingEnabled: z.boolean().optional(),
    settingsEnabled: z.boolean().optional(),
    tagsEnabled: z.boolean().optional(),
    leadValueEnabled: z.boolean().optional(),
    marketingEnabled: z.boolean().optional(),
    agentReportingEnabled: z.boolean().optional(),
    botService: z.boolean().optional(),
    socialPlanner: z.boolean().optional(),
    bloggingEnabled: z.boolean().optional(),
    invoiceEnabled: z.boolean().optional(),
    affiliateManagerEnabled: z.boolean().optional(),
    contentAiEnabled: z.boolean().optional(),
    refundsEnabled: z.boolean().optional(),
    recordPaymentEnabled: z.boolean().optional(),
    cancelSubscriptionEnabled: z.boolean().optional(),
    paymentsEnabled: z.boolean().optional(),
    communitiesEnabled: z.boolean().optional(),
    exportPaymentsEnabled: z.boolean().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    extension: z.string().optional(),
    permissions: ProviderPermissionsSchema.optional(),
    scopes: z.array(z.string()).optional(),
    roles: ProviderRoleSchema.optional(),
    lcPhone: z.record(z.string(), z.unknown()).optional(),
    platformLanguage: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    extension: z.string().optional(),
    permissions: ProviderPermissionsSchema.optional(),
    scopes: z.array(z.string()).optional(),
    roles: ProviderRoleSchema.optional(),
    lcPhone: z.record(z.string(), z.unknown()).optional(),
    platformLanguage: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/44d85a5a9087e-get-user
            endpoint: `/users/${encodeURIComponent(input.userId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.firstName !== undefined && { firstName: providerUser.firstName }),
            ...(providerUser.lastName !== undefined && { lastName: providerUser.lastName }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.phone !== undefined && { phone: providerUser.phone }),
            ...(providerUser.extension !== undefined && { extension: providerUser.extension }),
            ...(providerUser.permissions !== undefined && { permissions: providerUser.permissions }),
            ...(providerUser.scopes !== undefined && { scopes: providerUser.scopes }),
            ...(providerUser.roles !== undefined && { roles: providerUser.roles }),
            ...(providerUser.lcPhone !== undefined && { lcPhone: providerUser.lcPhone }),
            ...(providerUser.platformLanguage !== undefined && { platformLanguage: providerUser.platformLanguage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
