import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    securityProblemId: z.string().describe('Security problem ID. Example: "S-7"')
});

const RiskAssessmentSchema = z.object({
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
    assessmentAccuracyDetails: z
        .object({
            reducedReasons: z.array(z.string()).optional()
        })
        .optional(),
    vulnerableFunctionRestartRequired: z.boolean().optional()
});

const OutputSchema = z.object({
    securityProblemId: z.string(),
    displayId: z.string().optional(),
    status: z.string().optional(),
    muted: z.boolean().optional(),
    externalVulnerabilityId: z.string().optional(),
    vulnerabilityType: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    packageName: z.string().optional(),
    url: z.string().optional(),
    technology: z.string().optional(),
    firstSeenTimestamp: z.number().optional(),
    lastUpdatedTimestamp: z.number().optional(),
    riskAssessment: RiskAssessmentSchema.optional(),
    cveIds: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Get full details of a single security problem.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['securityProblems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/application-security/vulnerabilities/get-vulnerability-details
            endpoint: `api/v2/securityProblems/${encodeURIComponent(input.securityProblemId)}`,
            retries: 3
        });

        if (response.data === null || response.data === undefined || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Security problem not found or unexpected response',
                securityProblemId: input.securityProblemId
            });
        }

        const providerSecurityProblem = OutputSchema.parse(response.data);

        return {
            securityProblemId: providerSecurityProblem.securityProblemId,
            displayId: providerSecurityProblem.displayId,
            status: providerSecurityProblem.status,
            muted: providerSecurityProblem.muted,
            externalVulnerabilityId: providerSecurityProblem.externalVulnerabilityId,
            vulnerabilityType: providerSecurityProblem.vulnerabilityType,
            title: providerSecurityProblem.title,
            description: providerSecurityProblem.description,
            packageName: providerSecurityProblem.packageName,
            url: providerSecurityProblem.url,
            technology: providerSecurityProblem.technology,
            firstSeenTimestamp: providerSecurityProblem.firstSeenTimestamp,
            lastUpdatedTimestamp: providerSecurityProblem.lastUpdatedTimestamp,
            riskAssessment: providerSecurityProblem.riskAssessment,
            cveIds: providerSecurityProblem.cveIds
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
