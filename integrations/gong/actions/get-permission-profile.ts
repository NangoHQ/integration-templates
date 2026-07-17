import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    profileId: z.string().describe('The ID of the permission profile to retrieve. Example: "3843152912968920037"')
});

const PermissionLevelSchema = z.object({
    permissionLevel: z.string().nullish(),
    teamLeadIds: z.array(z.string()).nullish()
});

const LibraryFolderAccessSchema = z.object({
    permissionLevel: z.string().nullish(),
    libraryFolderIds: z.array(z.string()).nullish(),
    managePublicFolder: z.boolean().nullish(),
    manageStreams: z.boolean().nullish(),
    manageFolderCalls: z.boolean().nullish(),
    shareFoldersAndStreams: z.boolean().nullish()
});

const ForecastAccessSchema = z.object({
    permissionLevel: z.string().nullish(),
    teamLeadIds: z.array(z.string()).nullish()
});

const ForecastPermissionsSchema = z.object({
    forecastAccess: ForecastAccessSchema.nullish(),
    forecastEditSubmissions: ForecastAccessSchema.nullish(),
    forecastEditTargets: ForecastAccessSchema.nullish()
});

const ProviderProfileSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        callsAccess: PermissionLevelSchema.nullish(),
        libraryFolderAccess: LibraryFolderAccessSchema.nullish(),
        dealsAccess: PermissionLevelSchema.nullish(),
        forecastPermissions: ForecastPermissionsSchema.nullish(),
        coachingAccess: PermissionLevelSchema.nullish(),
        insightsAccess: PermissionLevelSchema.nullish(),
        usageAccess: PermissionLevelSchema.nullish(),
        emailsAccess: PermissionLevelSchema.nullish(),
        scoreCalls: z.boolean().nullish(),
        overrideScore: z.boolean().nullish(),
        downloadCallMedia: z.boolean().nullish(),
        shareCallsWithCustomers: z.boolean().nullish(),
        manuallyScheduleAndUploadCalls: z.boolean().nullish(),
        privateCalls: z.boolean().nullish(),
        deleteCalls: z.boolean().nullish(),
        trimCalls: z.boolean().nullish(),
        listenInCalls: z.boolean().nullish(),
        deleteEmails: z.boolean().nullish(),
        callsAndSearch: z.boolean().nullish(),
        library: z.boolean().nullish(),
        deals: z.boolean().nullish(),
        createEditAndDeleteDealsBoards: z.boolean().nullish(),
        dealsInlineEditing: z.boolean().nullish(),
        account: z.boolean().nullish(),
        coaching: z.boolean().nullish(),
        usage: z.boolean().nullish(),
        teamStats: z.boolean().nullish(),
        initiatives: z.boolean().nullish(),
        market: z.boolean().nullish(),
        activity: z.boolean().nullish(),
        forecast: z.boolean().nullish(),
        forecastManage: z.boolean().nullish(),
        engageManageCompanyTemplates: z.boolean().nullish(),
        engageManageCompanySequences: z.boolean().nullish(),
        engageCreateAndManageRulesets: z.boolean().nullish(),
        engageSnoozeFlowToDosForOthers: z.boolean().nullish(),
        engageAllowCrmFieldsViewChange: z.boolean().nullish(),
        viewEngageAnalyticsActivity: z.boolean().nullish(),
        viewEngageAnalyticsPerformance: z.boolean().nullish(),
        viewEngageAnalyticsFlows: z.boolean().nullish(),
        manageGeneralBusinessSettings: z.boolean().nullish(),
        manageScorecards: z.boolean().nullish(),
        exportCallsAndCoachingDataToCSV: z.boolean().nullish(),
        crmDataInlineEditing: z.boolean().nullish(),
        crmDataImport: z.boolean().nullish(),
        viewRevenueAnalytics: z.boolean().nullish(),
        manageRevenueAnalytics: z.boolean().nullish(),
        engageReassignFlowToDosToOthers: z.boolean().nullish(),
        engageAssignFlowToDosToOthers: z.boolean().nullish(),
        dealsDataExport: z.boolean().nullish(),
        orchestrateCreateAndManagePlays: z.boolean().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    profile: ProviderProfileSchema.nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    profile: ProviderProfileSchema.nullish()
});

const action = createAction({
    description: 'Retrieve a specific Gong permission profile by ID.',
    version: '1.0.2',
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
