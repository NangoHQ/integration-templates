import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    releasesSelector: z.string().optional().describe('A selector to filter releases. Example: entityName("order-processing")'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from a previous response.'),
    pageSize: z.number().optional().describe('The number of releases per page. Max 1000.')
});

const ReleaseSchema = z
    .object({
        affectedByProblems: z.boolean().optional(),
        affectedBySecurityVulnerabilities: z.boolean().optional(),
        instances: z.array(z.unknown()).optional(),
        name: z.string().optional(),
        problemCount: z.number().optional(),
        product: z.string().optional(),
        releaseEntityId: z.string().optional(),
        running: z.boolean().optional(),
        securityVulnerabilitiesCount: z.number().optional(),
        securityVulnerabilitiesEnabled: z.boolean().optional(),
        softwareTechs: z.array(z.unknown()).optional(),
        stage: z.string().optional(),
        throughput: z.number().optional(),
        version: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ReleaseSchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number().optional(),
    releasesWithProblems: z.number().optional(),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'List software releases/deployments tracked for monitored entities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['releases.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { nextPageKey?: string; releasesSelector?: string; pageSize?: number } = {};

        if (input.cursor !== undefined) {
            params.nextPageKey = input.cursor;
        } else {
            if (input.releasesSelector !== undefined) {
                params.releasesSelector = input.releasesSelector;
            }
            if (input.pageSize !== undefined) {
                params.pageSize = input.pageSize;
            }
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/releaseapi/get-releaseall
            endpoint: '/api/v2/releases',
            params,
            retries: 3
        });

        const releasesResponse = z
            .object({
                nextPageKey: z.string().nullable().optional(),
                pageSize: z.number().optional(),
                releases: z.array(z.unknown()).optional(),
                releasesWithProblems: z.number().optional(),
                totalCount: z.number().optional()
            })
            .parse(response.data);

        const items = (releasesResponse.releases || []).map((release: unknown) => {
            return ReleaseSchema.parse(release);
        });

        return {
            items,
            ...(releasesResponse.nextPageKey != null && { nextPageKey: releasesResponse.nextPageKey }),
            ...(releasesResponse.pageSize !== undefined && { pageSize: releasesResponse.pageSize }),
            ...(releasesResponse.releasesWithProblems !== undefined && { releasesWithProblems: releasesResponse.releasesWithProblems }),
            ...(releasesResponse.totalCount !== undefined && { totalCount: releasesResponse.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
