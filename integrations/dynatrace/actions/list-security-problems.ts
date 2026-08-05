import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().optional().describe('The amount of security problems in a single response payload. The maximal allowed page size is 500.'),
    securityProblemSelector: z
        .string()
        .optional()
        .describe('Defines the scope of the query. Only security problems matching the specified criteria are included in the response.'),
    sort: z.string().optional().describe('Specifies one or more fields for sorting the security problem list.'),
    fields: z.string().optional().describe('A list of additional security problem properties you can add to the response.'),
    from: z.string().optional().describe('The start of the requested timeframe.'),
    to: z.string().optional().describe('The end of the requested timeframe.')
});

const ManagementZoneSchema = z.object({
    id: z.string(),
    name: z.string()
});

const RiskAssessmentSchema = z.object({
    assessmentAccuracy: z.string().optional(),
    assessmentAccuracyDetails: z
        .object({
            reducedReasons: z.array(z.string()).optional()
        })
        .optional(),
    baseRiskLevel: z.string().optional(),
    baseRiskScore: z.number().optional(),
    baseRiskVector: z.string().optional(),
    dataAssets: z.string().optional(),
    exposure: z.string().optional(),
    publicExploit: z.string().optional(),
    riskLevel: z.string().optional(),
    riskScore: z.number().optional(),
    riskVector: z.string().optional(),
    vulnerableFunctionUsage: z.string().optional()
});

const GlobalCountsSchema = z.object({
    affectedNodes: z.number().optional(),
    affectedProcessGroupInstances: z.number().optional(),
    affectedProcessGroups: z.number().optional(),
    exposedProcessGroups: z.number().optional(),
    reachableDataAssets: z.number().optional(),
    relatedApplications: z.number().optional(),
    relatedAttacks: z.number().optional(),
    relatedHosts: z.number().optional(),
    relatedKubernetesClusters: z.number().optional(),
    relatedKubernetesWorkloads: z.number().optional(),
    relatedServices: z.number().optional(),
    vulnerableComponents: z.number().optional()
});

const SecurityProblemSchema = z
    .object({
        securityProblemId: z.string(),
        displayId: z.string(),
        status: z.string(),
        muted: z.boolean(),
        externalVulnerabilityId: z.string(),
        vulnerabilityType: z.string(),
        title: z.string(),
        packageName: z.string().optional(),
        url: z.string().optional(),
        technology: z.string().optional(),
        firstSeenTimestamp: z.number().optional(),
        lastUpdatedTimestamp: z.number().optional(),
        lastOpenedTimestamp: z.number().optional(),
        lastResolvedTimestamp: z.number().optional(),
        cveIds: z.array(z.string()).optional(),
        riskAssessment: RiskAssessmentSchema.optional(),
        managementZones: z.array(ManagementZoneSchema).optional(),
        globalCounts: GlobalCountsSchema.optional()
    })
    .passthrough();

const SecurityProblemListSchema = z.object({
    totalCount: z.number(),
    pageSize: z.number(),
    nextPageKey: z.string().nullable().optional(),
    securityProblems: z.array(SecurityProblemSchema)
});

const OutputSchema = z.object({
    items: z.array(SecurityProblemSchema),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List detected security vulnerabilities (Runtime Application Protection).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['securityProblems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/application-security/vulnerabilities/get-vulnerabilities
            endpoint: '/api/v2/securityProblems',
            params: {
                ...(input.cursor !== undefined && { nextPageKey: input.cursor }),
                ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) }),
                ...(input.securityProblemSelector !== undefined && { securityProblemSelector: input.securityProblemSelector }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.from !== undefined && { from: input.from }),
                ...(input.to !== undefined && { to: input.to })
            },
            retries: 3
        });

        const list = SecurityProblemListSchema.parse(response.data);

        return {
            items: list.securityProblems,
            ...(list.nextPageKey != null && { nextPageKey: list.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
