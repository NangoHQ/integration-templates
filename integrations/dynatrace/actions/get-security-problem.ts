import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    securityProblemId: z.string().describe('The ID of the security problem. Example: "7412525767433554374" or "S-7"')
});

const RiskAssessmentSchema = z
    .object({
        riskLevel: z.string().optional(),
        riskScore: z.number().optional(),
        riskVector: z.string().optional(),
        baseRiskLevel: z.string().optional(),
        baseRiskScore: z.number().optional(),
        baseRiskVector: z.string().optional(),
        exposure: z.string().optional(),
        dataAssets: z.string().optional(),
        publicExploit: z.string().optional(),
        vulnerableFunctionUsage: z.string().optional(),
        assessmentAccuracy: z.string().optional(),
        vulnerableFunctionRestartRequired: z.boolean().optional()
    })
    .passthrough();

const ManagementZoneSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const CodeLevelVulnerabilityDetailsSchema = z
    .object({
        processGroupIds: z.array(z.string()).optional(),
        processGroups: z.array(z.string()).optional(),
        shortVulnerabilityLocation: z.string().optional(),
        type: z.string().optional(),
        vulnerabilityLocation: z.string().optional()
    })
    .passthrough();

const EntryPointSchema = z
    .object({
        method: z.string().optional(),
        url: z.string().optional()
    })
    .passthrough();

const EntryPointsSchema = z
    .object({
        entryPoints: z.array(EntryPointSchema).optional(),
        truncated: z.boolean().optional()
    })
    .passthrough();

const SecurityProblemEventSchema = z
    .object({
        eventType: z.string().optional(),
        timestamp: z.number().optional(),
        message: z.string().optional()
    })
    .passthrough();

const RelatedEntityRefSchema = z
    .object({
        id: z.string().optional(),
        numberOfAffectedEntities: z.number().optional(),
        affectedEntities: z.array(z.string()).optional()
    })
    .passthrough();

const RelatedServiceSchema = z
    .object({
        id: z.string().optional(),
        numberOfAffectedEntities: z.number().optional(),
        affectedEntities: z.array(z.string()).optional(),
        exposure: z.string().optional()
    })
    .passthrough();

const RelatedEntitiesSchema = z
    .object({
        applications: z.array(RelatedEntityRefSchema).optional(),
        services: z.array(RelatedServiceSchema).optional(),
        hosts: z.array(RelatedEntityRefSchema).optional(),
        databases: z.array(z.string()).optional(),
        kubernetesWorkloads: z.array(RelatedEntityRefSchema).optional(),
        kubernetesClusters: z.array(RelatedEntityRefSchema).optional()
    })
    .passthrough();

const VulnerableComponentSchema = z
    .object({
        id: z.string().optional(),
        displayName: z.string().optional(),
        shortName: z.string().optional(),
        fileName: z.string().optional(),
        affectedEntities: z.array(z.string()).optional(),
        numberOfAffectedEntities: z.number().optional()
    })
    .passthrough();

const GlobalCountsSchema = z
    .object({
        affectedEntities: z.number().optional(),
        totalEntities: z.number().optional(),
        vulnerableComponents: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    securityProblemId: z.string(),
    displayId: z.string().optional(),
    status: z.string().optional(),
    muted: z.boolean().optional(),
    externalVulnerabilityId: z.string().optional(),
    vulnerabilityType: z.string().optional(),
    title: z.string().optional(),
    packageName: z.string().optional(),
    url: z.string().optional(),
    technology: z.string().optional(),
    firstSeenTimestamp: z.number().optional(),
    lastUpdatedTimestamp: z.number().optional(),
    lastOpenedTimestamp: z.number().optional(),
    lastResolvedTimestamp: z.number().optional(),
    cveIds: z.array(z.string()).optional(),
    description: z.string().optional(),
    remediationDescription: z.string().optional(),
    riskAssessment: RiskAssessmentSchema.optional(),
    affectedEntities: z.array(z.string()).optional(),
    codeLevelVulnerabilityDetails: CodeLevelVulnerabilityDetailsSchema.optional(),
    entryPoints: EntryPointsSchema.optional(),
    events: z.array(SecurityProblemEventSchema).optional(),
    relatedEntities: RelatedEntitiesSchema.optional(),
    vulnerableComponents: z.array(VulnerableComponentSchema).optional(),
    managementZones: z.array(ManagementZoneSchema).optional(),
    globalCounts: GlobalCountsSchema.optional()
});

const action = createAction({
    description: 'Get full details of a single security problem.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['securityProblems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedId = encodeURIComponent(input.securityProblemId);

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/application-security/security-problems/get-problem
        const response = await nango.get({
            endpoint: `/api/v2/securityProblems/${encodedId}`,
            params: {
                fields: '+riskAssessment,+managementZones,+codeLevelVulnerabilityDetails,+globalCounts,+description,+remediationDescription,+events,+entryPoints,+vulnerableComponents,+affectedEntities,+relatedEntities'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Security problem not found',
                securityProblemId: input.securityProblemId
            });
        }

        const providerData = OutputSchema.parse(response.data);
        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
