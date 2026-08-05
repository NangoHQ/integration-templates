import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(500).optional().describe('The amount of security problems in a single response payload. Max 500.'),
    securityProblemSelector: z.string().optional().describe('Selector string to filter security problems. Example: status(OPEN)'),
    sort: z.string().optional().describe('Sorting criteria. Example: -riskAssessment.riskScore'),
    fields: z.string().optional().describe('Additional fields to include. Example: +riskAssessment,+globalCounts'),
    from: z.string().optional().describe('Start of the requested timeframe. Example: now-30d'),
    to: z.string().optional().describe('End of the requested timeframe.')
});

const ManagementZoneSchema = z.object({
    id: z.string(),
    name: z.string()
});

const RiskAssessmentSchema = z.object({
    assessmentAccuracy: z.string().optional(),
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

const GlobalCountsSchema = z
    .object({
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
    })
    .passthrough();

const SecurityProblemSchema = z.object({
    securityProblemId: z.string(),
    displayId: z.string(),
    status: z.string(),
    muted: z.boolean(),
    externalVulnerabilityId: z.string().optional(),
    vulnerabilityType: z.string(),
    title: z.string(),
    packageName: z.string().optional(),
    url: z.string().optional(),
    technology: z.string().optional(),
    firstSeenTimestamp: z.number(),
    lastUpdatedTimestamp: z.number(),
    cveIds: z.array(z.string()).optional(),
    lastOpenedTimestamp: z.number().optional(),
    lastResolvedTimestamp: z.number().optional(),
    riskAssessment: RiskAssessmentSchema.optional(),
    managementZones: z.array(ManagementZoneSchema).optional(),
    globalCounts: GlobalCountsSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(SecurityProblemSchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number(),
    totalCount: z.number()
});

const action = createAction({
    description: 'List detected security vulnerabilities (Runtime Application Protection)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['securityProblems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace requires nextPageKey to be sent alone on continuation requests; filters/pageSize are only valid on the first page.
        const params: Record<string, string | number> = input.cursor
            ? { nextPageKey: input.cursor }
            : {
                  ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                  ...(input.securityProblemSelector !== undefined && { securityProblemSelector: input.securityProblemSelector }),
                  ...(input.sort !== undefined && { sort: input.sort }),
                  ...(input.fields !== undefined && { fields: input.fields }),
                  ...(input.from !== undefined && { from: input.from }),
                  ...(input.to !== undefined && { to: input.to })
              };

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/security-problems/get-all
        const response = await nango.get({
            endpoint: '/api/v2/securityProblems',
            params,
            retries: 3
        });

        const listSchema = z.object({
            securityProblems: z.array(SecurityProblemSchema),
            nextPageKey: z.string().nullable().optional(),
            pageSize: z.number(),
            totalCount: z.number()
        });

        const list = listSchema.parse(response.data);

        return {
            items: list.securityProblems,
            ...(list.nextPageKey != null && { nextPageKey: list.nextPageKey }),
            pageSize: list.pageSize,
            totalCount: list.totalCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
