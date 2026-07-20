import { z } from 'zod';
import { createAction } from 'nango';

const PermissionLevelSchema = z.enum(['all', 'managers-team', 'report-to-them', 'own', 'none']);

const CallAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const LibraryFolderAccessSchema = z.object({
    permissionLevel: z.enum(['none', 'all', 'specific-folders']),
    libraryFolderIds: z.array(z.string()).nullish(),
    managePublicFolder: z.boolean().optional(),
    manageStreams: z.boolean().optional(),
    manageFolderCalls: z.boolean().optional(),
    shareFoldersAndStreams: z.boolean().optional()
});

const DealsAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const ForecastAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const ForecastPermissionsSchema = z.object({
    forecastAccess: ForecastAccessSchema.optional(),
    forecastEditSubmissions: ForecastAccessSchema.optional(),
    forecastEditTargets: ForecastAccessSchema.optional()
});

const CoachingAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const InsightsAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const UsageAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const EmailsAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema,
    teamLeadIds: z.array(z.string()).nullish()
});

const InputSchema = z.object({
    profileId: z.string().describe('The Id of the permission profile to update. Example: "3843152912968920037"'),
    name: z.string().optional().describe('Permission profile name.'),
    description: z.string().optional().describe('Permission profile description.'),
    callsAccess: CallAccessSchema.optional().describe('Calls access permission.'),
    libraryFolderAccess: LibraryFolderAccessSchema.optional().describe('Library folder access permission.'),
    dealsAccess: DealsAccessSchema.optional().describe('Deals access permission.'),
    forecastPermissions: ForecastPermissionsSchema.optional().describe('All forecast permissions.'),
    coachingAccess: CoachingAccessSchema.optional().describe('Coaching access permission.'),
    insightsAccess: InsightsAccessSchema.optional().describe('Insights access permission.'),
    usageAccess: UsageAccessSchema.optional().describe('Usage access permission.'),
    emailsAccess: EmailsAccessSchema.optional().describe('Emails access permission.'),
    scoreCalls: z.boolean().optional().describe('User can score calls.'),
    overrideScore: z.boolean().optional().describe('User can override someone else score.'),
    downloadCallMedia: z.boolean().optional().describe('User can download call media.'),
    shareCallsWithCustomers: z.boolean().optional().describe('User can share calls with customers.'),
    manuallyScheduleAndUploadCalls: z.boolean().optional().describe('User can manually schedule and upload calls.'),
    privateCalls: z.boolean().optional().describe('User can set their own calls as private.'),
    deleteCalls: z.boolean().optional().describe('User can delete calls.'),
    trimCalls: z.boolean().optional().describe('User can trim calls.'),
    listenInCalls: z.boolean().optional().describe('User can listen in calls.'),
    deleteEmails: z.boolean().optional().describe('User can delete emails.'),
    callsAndSearch: z.boolean().optional().describe('User can view and search calls.'),
    library: z.boolean().optional().describe('User can view library pages.'),
    deals: z.boolean().optional().describe('User can view deals pages.'),
    createEditAndDeleteDealsBoards: z.boolean().optional().describe('User can create/edit/delete deals boards.'),
    dealsInlineEditing: z.boolean().optional().describe('User can perform inline editing of deals.'),
    account: z.boolean().optional().describe('User can view account pages.'),
    coaching: z.boolean().optional().describe('User can view coaching pages.'),
    usage: z.boolean().optional().describe('User can view usage pages.'),
    teamStats: z.boolean().optional().describe('User can view team stats page.'),
    initiatives: z.boolean().optional().describe('User can view initiatives page.'),
    market: z.boolean().optional().describe('User can view market page.'),
    activity: z.boolean().optional().describe('User can view activity pages.'),
    forecast: z.boolean().optional().describe('User can view forecast pages.'),
    forecastManage: z.boolean().optional().describe('User can manage forecast boards and upload targets.'),
    engageManageCompanyTemplates: z.boolean().optional().describe('User can manage company email templates.'),
    engageManageCompanySequences: z.boolean().optional().describe('User can manage company sequences.'),
    engageCreateAndManageRulesets: z.boolean().optional().describe('User can create and manage rulesets.'),
    engageSnoozeFlowToDosForOthers: z.boolean().optional().describe('User can snooze flow in to dos for others.'),
    engageAllowCrmFieldsViewChange: z.boolean().optional().describe('User can change crm fields view.'),
    viewEngageAnalyticsActivity: z.boolean().optional().describe('User can view engage analytics activity page.'),
    viewEngageAnalyticsPerformance: z.boolean().optional().describe('User can view engage analytics performance page.'),
    viewEngageAnalyticsFlows: z.boolean().optional().describe('User can view engage analytics flows page.'),
    manageGeneralBusinessSettings: z.boolean().optional().describe('User can manage general business settings.'),
    manageScorecards: z.boolean().optional().describe('User can manage scorecards.'),
    exportCallsAndCoachingDataToCSV: z.boolean().optional().describe('User can export calls and coaching metrics data to CSV.'),
    crmDataInlineEditing: z.boolean().optional().describe('User can perform inline editing of crm data.'),
    crmDataImport: z.boolean().optional().describe('User can perform import of crm data.'),
    viewRevenueAnalytics: z.boolean().optional().describe('User can view dashboards page.'),
    manageRevenueAnalytics: z.boolean().optional().describe('User can manage revenue analytics.'),
    engageReassignFlowToDosToOthers: z.boolean().optional().describe('User can reassign flow to-dos to others.'),
    engageAssignFlowToDosToOthers: z.boolean().optional().describe('User can assign flow to-dos to others.'),
    dealsDataExport: z.boolean().optional().describe('User can export deals data.')
});

const OutputAccessSchema = z.object({
    permissionLevel: PermissionLevelSchema.nullable(),
    teamLeadIds: z.array(z.string()).nullish()
});

const OutputLibraryFolderAccessSchema = z.object({
    permissionLevel: z.enum(['none', 'all', 'specific-folders']).nullable(),
    libraryFolderIds: z.array(z.string()).nullish(),
    managePublicFolder: z.boolean().nullish(),
    manageStreams: z.boolean().nullish(),
    manageFolderCalls: z.boolean().nullish(),
    shareFoldersAndStreams: z.boolean().nullish()
});

const OutputForecastPermissionsSchema = z.object({
    forecastAccess: OutputAccessSchema.nullish(),
    forecastEditSubmissions: OutputAccessSchema.nullish(),
    forecastEditTargets: OutputAccessSchema.nullish()
});

const OutputProfileSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    callsAccess: OutputAccessSchema.nullish(),
    libraryFolderAccess: OutputLibraryFolderAccessSchema.nullish(),
    dealsAccess: OutputAccessSchema.nullish(),
    forecastPermissions: OutputForecastPermissionsSchema.nullish(),
    coachingAccess: OutputAccessSchema.nullish(),
    insightsAccess: OutputAccessSchema.nullish(),
    usageAccess: OutputAccessSchema.nullish(),
    emailsAccess: OutputAccessSchema.nullish(),
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
});

const ProviderProfileSchema = OutputProfileSchema.passthrough();

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    profile: ProviderProfileSchema.nullish()
});

const OutputSchema = OutputProfileSchema;

const action = createAction({
    description: 'Update an existing Gong permission profile.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:permission-profile:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://help.gong.io/apidocs/update-permission-profile
            endpoint: '/v2/permission-profile',
            params: {
                profileId: input.profileId
            },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.callsAccess !== undefined && { callsAccess: input.callsAccess }),
                ...(input.libraryFolderAccess !== undefined && { libraryFolderAccess: input.libraryFolderAccess }),
                ...(input.dealsAccess !== undefined && { dealsAccess: input.dealsAccess }),
                ...(input.forecastPermissions !== undefined && { forecastPermissions: input.forecastPermissions }),
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
                ...(input.dealsDataExport !== undefined && { dealsDataExport: input.dealsDataExport })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.profile) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Permission profile not found or update failed.',
                profileId: input.profileId
            });
        }

        return {
            id: providerResponse.profile.id,
            ...(providerResponse.profile.name !== undefined && { name: providerResponse.profile.name }),
            ...(providerResponse.profile.description !== undefined && { description: providerResponse.profile.description }),
            ...(providerResponse.profile.callsAccess !== undefined && { callsAccess: providerResponse.profile.callsAccess }),
            ...(providerResponse.profile.libraryFolderAccess !== undefined && { libraryFolderAccess: providerResponse.profile.libraryFolderAccess }),
            ...(providerResponse.profile.dealsAccess !== undefined && { dealsAccess: providerResponse.profile.dealsAccess }),
            ...(providerResponse.profile.forecastPermissions !== undefined && { forecastPermissions: providerResponse.profile.forecastPermissions }),
            ...(providerResponse.profile.coachingAccess !== undefined && { coachingAccess: providerResponse.profile.coachingAccess }),
            ...(providerResponse.profile.insightsAccess !== undefined && { insightsAccess: providerResponse.profile.insightsAccess }),
            ...(providerResponse.profile.usageAccess !== undefined && { usageAccess: providerResponse.profile.usageAccess }),
            ...(providerResponse.profile.emailsAccess !== undefined && { emailsAccess: providerResponse.profile.emailsAccess }),
            ...(providerResponse.profile.scoreCalls !== undefined && { scoreCalls: providerResponse.profile.scoreCalls }),
            ...(providerResponse.profile.overrideScore !== undefined && { overrideScore: providerResponse.profile.overrideScore }),
            ...(providerResponse.profile.downloadCallMedia !== undefined && { downloadCallMedia: providerResponse.profile.downloadCallMedia }),
            ...(providerResponse.profile.shareCallsWithCustomers !== undefined && {
                shareCallsWithCustomers: providerResponse.profile.shareCallsWithCustomers
            }),
            ...(providerResponse.profile.manuallyScheduleAndUploadCalls !== undefined && {
                manuallyScheduleAndUploadCalls: providerResponse.profile.manuallyScheduleAndUploadCalls
            }),
            ...(providerResponse.profile.privateCalls !== undefined && { privateCalls: providerResponse.profile.privateCalls }),
            ...(providerResponse.profile.deleteCalls !== undefined && { deleteCalls: providerResponse.profile.deleteCalls }),
            ...(providerResponse.profile.trimCalls !== undefined && { trimCalls: providerResponse.profile.trimCalls }),
            ...(providerResponse.profile.listenInCalls !== undefined && { listenInCalls: providerResponse.profile.listenInCalls }),
            ...(providerResponse.profile.deleteEmails !== undefined && { deleteEmails: providerResponse.profile.deleteEmails }),
            ...(providerResponse.profile.callsAndSearch !== undefined && { callsAndSearch: providerResponse.profile.callsAndSearch }),
            ...(providerResponse.profile.library !== undefined && { library: providerResponse.profile.library }),
            ...(providerResponse.profile.deals !== undefined && { deals: providerResponse.profile.deals }),
            ...(providerResponse.profile.createEditAndDeleteDealsBoards !== undefined && {
                createEditAndDeleteDealsBoards: providerResponse.profile.createEditAndDeleteDealsBoards
            }),
            ...(providerResponse.profile.dealsInlineEditing !== undefined && { dealsInlineEditing: providerResponse.profile.dealsInlineEditing }),
            ...(providerResponse.profile.account !== undefined && { account: providerResponse.profile.account }),
            ...(providerResponse.profile.coaching !== undefined && { coaching: providerResponse.profile.coaching }),
            ...(providerResponse.profile.usage !== undefined && { usage: providerResponse.profile.usage }),
            ...(providerResponse.profile.teamStats !== undefined && { teamStats: providerResponse.profile.teamStats }),
            ...(providerResponse.profile.initiatives !== undefined && { initiatives: providerResponse.profile.initiatives }),
            ...(providerResponse.profile.market !== undefined && { market: providerResponse.profile.market }),
            ...(providerResponse.profile.activity !== undefined && { activity: providerResponse.profile.activity }),
            ...(providerResponse.profile.forecast !== undefined && { forecast: providerResponse.profile.forecast }),
            ...(providerResponse.profile.forecastManage !== undefined && { forecastManage: providerResponse.profile.forecastManage }),
            ...(providerResponse.profile.engageManageCompanyTemplates !== undefined && {
                engageManageCompanyTemplates: providerResponse.profile.engageManageCompanyTemplates
            }),
            ...(providerResponse.profile.engageManageCompanySequences !== undefined && {
                engageManageCompanySequences: providerResponse.profile.engageManageCompanySequences
            }),
            ...(providerResponse.profile.engageCreateAndManageRulesets !== undefined && {
                engageCreateAndManageRulesets: providerResponse.profile.engageCreateAndManageRulesets
            }),
            ...(providerResponse.profile.engageSnoozeFlowToDosForOthers !== undefined && {
                engageSnoozeFlowToDosForOthers: providerResponse.profile.engageSnoozeFlowToDosForOthers
            }),
            ...(providerResponse.profile.engageAllowCrmFieldsViewChange !== undefined && {
                engageAllowCrmFieldsViewChange: providerResponse.profile.engageAllowCrmFieldsViewChange
            }),
            ...(providerResponse.profile.viewEngageAnalyticsActivity !== undefined && {
                viewEngageAnalyticsActivity: providerResponse.profile.viewEngageAnalyticsActivity
            }),
            ...(providerResponse.profile.viewEngageAnalyticsPerformance !== undefined && {
                viewEngageAnalyticsPerformance: providerResponse.profile.viewEngageAnalyticsPerformance
            }),
            ...(providerResponse.profile.viewEngageAnalyticsFlows !== undefined && {
                viewEngageAnalyticsFlows: providerResponse.profile.viewEngageAnalyticsFlows
            }),
            ...(providerResponse.profile.manageGeneralBusinessSettings !== undefined && {
                manageGeneralBusinessSettings: providerResponse.profile.manageGeneralBusinessSettings
            }),
            ...(providerResponse.profile.manageScorecards !== undefined && { manageScorecards: providerResponse.profile.manageScorecards }),
            ...(providerResponse.profile.exportCallsAndCoachingDataToCSV !== undefined && {
                exportCallsAndCoachingDataToCSV: providerResponse.profile.exportCallsAndCoachingDataToCSV
            }),
            ...(providerResponse.profile.crmDataInlineEditing !== undefined && { crmDataInlineEditing: providerResponse.profile.crmDataInlineEditing }),
            ...(providerResponse.profile.crmDataImport !== undefined && { crmDataImport: providerResponse.profile.crmDataImport }),
            ...(providerResponse.profile.viewRevenueAnalytics !== undefined && { viewRevenueAnalytics: providerResponse.profile.viewRevenueAnalytics }),
            ...(providerResponse.profile.manageRevenueAnalytics !== undefined && { manageRevenueAnalytics: providerResponse.profile.manageRevenueAnalytics }),
            ...(providerResponse.profile.engageReassignFlowToDosToOthers !== undefined && {
                engageReassignFlowToDosToOthers: providerResponse.profile.engageReassignFlowToDosToOthers
            }),
            ...(providerResponse.profile.engageAssignFlowToDosToOthers !== undefined && {
                engageAssignFlowToDosToOthers: providerResponse.profile.engageAssignFlowToDosToOthers
            }),
            ...(providerResponse.profile.dealsDataExport !== undefined && { dealsDataExport: providerResponse.profile.dealsDataExport }),
            ...(providerResponse.profile.orchestrateCreateAndManagePlays !== undefined && {
                orchestrateCreateAndManagePlays: providerResponse.profile.orchestrateCreateAndManagePlays
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
