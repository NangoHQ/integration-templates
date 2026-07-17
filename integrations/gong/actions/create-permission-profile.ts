import { z } from 'zod';
import { createAction } from 'nango';

const PermissionLevelSchema = z.enum(['all', 'managers-team', 'report-to-them', 'own', 'none']);

const ScopedAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).optional()
});

const LibraryFolderAccessSchema = z.object({
    permissionLevel: z.enum(['none', 'all', 'specific-folders']),
    libraryFolderIds: z.array(z.string()).optional(),
    managePublicFolder: z.boolean().optional(),
    manageStreams: z.boolean().optional(),
    manageFolderCalls: z.boolean().optional(),
    shareFoldersAndStreams: z.boolean().optional()
});

const ForecastAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).optional()
});

const ForecastPermissionsSchema = z.object({
    forecastAccess: ForecastAccessSchema.optional(),
    forecastEditSubmissions: ForecastAccessSchema.optional(),
    forecastEditTargets: ForecastAccessSchema.optional()
});

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace identifier. Example: "7273476131570014205"'),
    profileId: z.string().describe('Unique numeric identifier for the permission profile (up to 20 digits). Example: "3843152912968920037"'),
    profileName: z.string().describe('Permission profile name. Example: "Standard Team Member"'),
    description: z.string().describe('Permission profile description. Example: "Default profile for sales team"'),
    libraryFolderAccess: LibraryFolderAccessSchema,
    forecastPermissions: ForecastPermissionsSchema.optional(),
    callsAccess: ScopedAccessSchema.optional(),
    dealsAccess: ScopedAccessSchema.optional(),
    coachingAccess: ScopedAccessSchema.optional(),
    insightsAccess: ScopedAccessSchema.optional(),
    usageAccess: ScopedAccessSchema.optional(),
    emailsAccess: ScopedAccessSchema.optional(),
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
    dealsDataExport: z.boolean().optional(),
    aiBuilder: z.boolean().optional()
});

const ProviderProfileResponseSchema = z.object({
    requestId: z.string(),
    profile: z.record(z.string(), z.unknown()).nullish()
});

const OutputSchema = z.object({
    requestId: z.string(),
    profile: z.record(z.string(), z.unknown()).nullish()
});

const action = createAction({
    description: 'Create a new permission profile in a Gong workspace',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:permission-profile:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            id: input.profileId,
            name: input.profileName,
            description: input.description,
            libraryFolderAccess: input.libraryFolderAccess,
            ...(input.forecastPermissions !== undefined && { forecastPermissions: input.forecastPermissions }),
            ...(input.callsAccess !== undefined && { callsAccess: input.callsAccess }),
            ...(input.dealsAccess !== undefined && { dealsAccess: input.dealsAccess }),
            ...(input.coachingAccess !== undefined && { coachingAccess: input.coachingAccess }),
            ...(input.insightsAccess !== undefined && { insightsAccess: input.insightsAccess }),
            ...(input.usageAccess !== undefined && { usageAccess: input.usageAccess }),
            ...(input.emailsAccess !== undefined && { emailsAccess: input.emailsAccess }),
            ...(input.scoreCalls !== undefined && { scoreCalls: input.scoreCalls }),
            ...(input.overrideScore !== undefined && { overrideScore: input.overrideScore }),
            ...(input.downloadCallMedia !== undefined && { downloadCallMedia: input.downloadCallMedia }),
            ...(input.shareCallsWithCustomers !== undefined && { shareCallsWithCustomers: input.shareCallsWithCustomers }),
            ...(input.manuallyScheduleAndUploadCalls !== undefined && { manuallyScheduleAndUploadCalls: input.manuallyScheduleAndUploadCalls }),
            ...(input.privateCalls !== undefined && { privateCalls: input.privateCalls }),
            ...(input.deleteCalls !== undefined && { deleteCalls: input.deleteCalls }),
            ...(input.trimCalls !== undefined && { trimCalls: input.trimCalls }),
            ...(input.listenInCalls !== undefined && { listenInCalls: input.listenInCalls }),
            ...(input.deleteEmails !== undefined && { deleteEmails: input.deleteEmails }),
            ...(input.callsAndSearch !== undefined && { callsAndSearch: input.callsAndSearch }),
            ...(input.library !== undefined && { library: input.library }),
            ...(input.deals !== undefined && { deals: input.deals }),
            ...(input.createEditAndDeleteDealsBoards !== undefined && { createEditAndDeleteDealsBoards: input.createEditAndDeleteDealsBoards }),
            ...(input.dealsInlineEditing !== undefined && { dealsInlineEditing: input.dealsInlineEditing }),
            ...(input.account !== undefined && { account: input.account }),
            ...(input.coaching !== undefined && { coaching: input.coaching }),
            ...(input.usage !== undefined && { usage: input.usage }),
            ...(input.teamStats !== undefined && { teamStats: input.teamStats }),
            ...(input.initiatives !== undefined && { initiatives: input.initiatives }),
            ...(input.market !== undefined && { market: input.market }),
            ...(input.activity !== undefined && { activity: input.activity }),
            ...(input.forecast !== undefined && { forecast: input.forecast }),
            ...(input.forecastManage !== undefined && { forecastManage: input.forecastManage }),
            ...(input.engageManageCompanyTemplates !== undefined && { engageManageCompanyTemplates: input.engageManageCompanyTemplates }),
            ...(input.engageManageCompanySequences !== undefined && { engageManageCompanySequences: input.engageManageCompanySequences }),
            ...(input.engageCreateAndManageRulesets !== undefined && { engageCreateAndManageRulesets: input.engageCreateAndManageRulesets }),
            ...(input.engageSnoozeFlowToDosForOthers !== undefined && { engageSnoozeFlowToDosForOthers: input.engageSnoozeFlowToDosForOthers }),
            ...(input.engageAllowCrmFieldsViewChange !== undefined && { engageAllowCrmFieldsViewChange: input.engageAllowCrmFieldsViewChange }),
            ...(input.viewEngageAnalyticsActivity !== undefined && { viewEngageAnalyticsActivity: input.viewEngageAnalyticsActivity }),
            ...(input.viewEngageAnalyticsPerformance !== undefined && { viewEngageAnalyticsPerformance: input.viewEngageAnalyticsPerformance }),
            ...(input.viewEngageAnalyticsFlows !== undefined && { viewEngageAnalyticsFlows: input.viewEngageAnalyticsFlows }),
            ...(input.manageGeneralBusinessSettings !== undefined && { manageGeneralBusinessSettings: input.manageGeneralBusinessSettings }),
            ...(input.manageScorecards !== undefined && { manageScorecards: input.manageScorecards }),
            ...(input.exportCallsAndCoachingDataToCSV !== undefined && { exportCallsAndCoachingDataToCSV: input.exportCallsAndCoachingDataToCSV }),
            ...(input.crmDataInlineEditing !== undefined && { crmDataInlineEditing: input.crmDataInlineEditing }),
            ...(input.crmDataImport !== undefined && { crmDataImport: input.crmDataImport }),
            ...(input.viewRevenueAnalytics !== undefined && { viewRevenueAnalytics: input.viewRevenueAnalytics }),
            ...(input.manageRevenueAnalytics !== undefined && { manageRevenueAnalytics: input.manageRevenueAnalytics }),
            ...(input.engageReassignFlowToDosToOthers !== undefined && { engageReassignFlowToDosToOthers: input.engageReassignFlowToDosToOthers }),
            ...(input.engageAssignFlowToDosToOthers !== undefined && { engageAssignFlowToDosToOthers: input.engageAssignFlowToDosToOthers }),
            ...(input.dealsDataExport !== undefined && { dealsDataExport: input.dealsDataExport }),
            ...(input.aiBuilder !== undefined && { aiBuilder: input.aiBuilder })
        };

        // https://help.gong.io/docs/create-permission-profile
        let response;
        // @allowTryCatch: The Gong API returns 401 when the api:permission-profile:write scope is missing.
        // We catch this and re-throw as a descriptive ActionError so callers receive a graceful, typed failure.
        try {
            response = await nango.post({
                endpoint: '/v2/permission-profile',
                params: {
                    workspaceId: input.workspaceId
                },
                data: body,
                retries: 3
            });
        } catch (err: unknown) {
            const errorStatus = z.object({ status: z.number() }).safeParse(err);
            if (errorStatus.success && errorStatus.data.status === 401) {
                throw new nango.ActionError({
                    type: 'unauthorized',
                    message: 'The connection does not have the required api:permission-profile:write scope to create permission profiles.'
                });
            }
            throw err;
        }

        const parsed = ProviderProfileResponseSchema.parse(response.data);

        return {
            requestId: parsed.requestId,
            ...(parsed.profile !== undefined && { profile: parsed.profile })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
