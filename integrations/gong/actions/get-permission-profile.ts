import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    profileId: z.string().describe('The ID of the permission profile to retrieve. Example: "3843152912968920037"')
});

const PermissionLevelSchema = z.object({
    permissionLevel: z.string().optional(),
    teamLeadIds: z.array(z.string()).nullable().optional()
});

const LibraryFolderAccessSchema = z.object({
    permissionLevel: z.string().optional(),
    libraryFolderIds: z.array(z.string()).nullable().optional(),
    managePublicFolder: z.boolean().optional(),
    manageStreams: z.boolean().optional(),
    manageFolderCalls: z.boolean().optional(),
    shareFoldersAndStreams: z.boolean().optional()
});

const ForecastAccessSchema = z.object({
    permissionLevel: z.string().optional(),
    teamLeadIds: z.array(z.string()).nullable().optional()
});

const ForecastPermissionsSchema = z.object({
    forecastAccess: ForecastAccessSchema.optional(),
    forecastEditSubmissions: ForecastAccessSchema.optional(),
    forecastEditTargets: ForecastAccessSchema.optional()
});

const ProviderProfileSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        callsAccess: PermissionLevelSchema.optional(),
        libraryFolderAccess: LibraryFolderAccessSchema.optional(),
        dealsAccess: PermissionLevelSchema.optional(),
        forecastPermissions: ForecastPermissionsSchema.optional(),
        coachingAccess: PermissionLevelSchema.optional(),
        insightsAccess: PermissionLevelSchema.optional(),
        usageAccess: PermissionLevelSchema.optional(),
        emailsAccess: PermissionLevelSchema.optional(),
        scoreCalls: z.boolean().optional(),
        overrideScore: z.boolean().optional(),
        downloadCallMedia: z.boolean().optional(),
        shareCallsWithCustomers: z.boolean().optional(),
        manuallyScheduleAndUploadCalls: z.boolean().optional(),
        privateCalls: z.boolean().optional(),
        deleteCalls: z.boolean().optional(),
        trimCalls: z.boolean().optional(),
        listenInCalls: z.boolean().optional(),
        deleteEmails: z.boolean().optional(),
        callsAndSearch: z.boolean().optional(),
        library: z.boolean().optional(),
        deals: z.boolean().optional(),
        createEditAndDeleteDealsBoards: z.boolean().optional(),
        dealsInlineEditing: z.boolean().optional(),
        account: z.boolean().optional(),
        coaching: z.boolean().optional(),
        usage: z.boolean().optional(),
        teamStats: z.boolean().optional(),
        initiatives: z.boolean().optional(),
        market: z.boolean().optional(),
        activity: z.boolean().optional(),
        forecast: z.boolean().optional(),
        forecastManage: z.boolean().optional(),
        engageManageCompanyTemplates: z.boolean().optional(),
        engageManageCompanySequences: z.boolean().optional(),
        engageCreateAndManageRulesets: z.boolean().optional(),
        engageSnoozeFlowToDosForOthers: z.boolean().optional(),
        engageAllowCrmFieldsViewChange: z.boolean().optional(),
        viewEngageAnalyticsActivity: z.boolean().optional(),
        viewEngageAnalyticsPerformance: z.boolean().optional(),
        viewEngageAnalyticsFlows: z.boolean().optional(),
        manageGeneralBusinessSettings: z.boolean().optional(),
        manageScorecards: z.boolean().optional(),
        exportCallsAndCoachingDataToCSV: z.boolean().optional(),
        crmDataInlineEditing: z.boolean().optional(),
        crmDataImport: z.boolean().optional(),
        viewRevenueAnalytics: z.boolean().optional(),
        manageRevenueAnalytics: z.boolean().optional(),
        engageReassignFlowToDosToOthers: z.boolean().optional(),
        engageAssignFlowToDosToOthers: z.boolean().optional(),
        dealsDataExport: z.boolean().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    profile: ProviderProfileSchema.optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    profile: ProviderProfileSchema.optional()
});

const action = createAction({
    description: 'Retrieve a specific Gong permission profile by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:permission-profile:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://help.gong.io/apidocs/retrieve-a-permission-profile
            endpoint: '/v2/permission-profile',
            params: {
                profileId: input.profileId
            },
            retries: 3
        };

        let response;
        // @allowTryCatch
        // The permission profile endpoint may return 401 if the scope is not enabled,
        // or 404 if the feature is unavailable on the current plan. We catch these
        // to throw a descriptive ActionError instead of a generic HTTP error.
        try {
            response = await nango.get(config);
        } catch (err: unknown) {
            const errObj = typeof err === 'object' && err !== null ? err : {};
            const status = 'status' in errObj && typeof errObj.status === 'number' ? errObj.status : undefined;
            const message =
                'message' in errObj && typeof errObj.message === 'string'
                    ? errObj.message
                    : 'An unexpected error occurred while retrieving the permission profile.';
            if (status === 401) {
                throw new nango.ActionError({
                    type: 'unauthorized',
                    message: 'Access denied. The api:permission-profile:read scope may not be enabled.',
                    profileId: input.profileId
                });
            }
            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Permission profile not found or permission profiles feature is not available on this plan.',
                    profileId: input.profileId
                });
            }
            throw new nango.ActionError({
                type: 'provider_error',
                message: message,
                profileId: input.profileId
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse permission profile response.',
                profileId: input.profileId,
                error: parsed.error.message
            });
        }

        if (!parsed.data.profile) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Gong returned a 200 response but no profile object was included.',
                profileId: input.profileId
            });
        }

        return {
            requestId: parsed.data.requestId,
            profile: parsed.data.profile
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
