import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    releasesSelector: z.string().optional().describe('Releases selector to filter results. Example: "releasesProduct(\\"order-processing\\")"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (nextPageKey). Omit for the first page.'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('Number of releases per page. Max 1000.')
});

const SoftwareTechSchema = z.object({
    edition: z.string().optional(),
    technology: z.string(),
    verbatimType: z.string().optional(),
    version: z.string().optional()
});

const ReleaseInstanceSchema = z.object({
    buildVersion: z.string().optional(),
    entityId: z.string(),
    problems: z.array(z.string()).optional(),
    securityVulnerabilities: z.array(z.string()).optional()
});

const ReleaseSchema = z.object({
    affectedByProblems: z.boolean().optional(),
    affectedBySecurityVulnerabilities: z.boolean().optional(),
    instances: z.array(ReleaseInstanceSchema).optional(),
    name: z.string(),
    problemCount: z.number().optional(),
    product: z.string().optional(),
    releaseEntityId: z.string().optional(),
    running: z.boolean().optional(),
    securityVulnerabilitiesCount: z.number().optional(),
    securityVulnerabilitiesEnabled: z.boolean().optional(),
    softwareTechs: z.array(SoftwareTechSchema).optional(),
    stage: z.string().optional(),
    throughput: z.number().optional(),
    version: z.string().optional()
});

const ProviderResponseSchema = z.object({
    releases: z.array(z.unknown()),
    totalCount: z.number().optional(),
    releasesWithProblems: z.number().optional(),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional()
});

const OutputSchema = z.object({
    releases: z.array(ReleaseSchema),
    totalCount: z.number().optional(),
    releasesWithProblems: z.number().optional(),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List software releases/deployments tracked for monitored entities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['releases.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace requires nextPageKey to be sent alone on continuation requests; filters/pageSize are only valid on the first page.
        const config: ProxyConfiguration = {
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/releaseapi/get-releaseall
            endpoint: '/api/v2/releases',
            params: input.cursor
                ? { nextPageKey: input.cursor }
                : {
                      ...(input.releasesSelector !== undefined && { releasesSelector: input.releasesSelector }),
                      ...(input.pageSize !== undefined && { pageSize: input.pageSize })
                  },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Dynatrace releases API'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);
        const releases = providerData.releases.map((item) => ReleaseSchema.parse(item));

        return {
            releases,
            totalCount: providerData.totalCount,
            releasesWithProblems: providerData.releasesWithProblems,
            ...(providerData.nextPageKey != null && { nextPageKey: providerData.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
