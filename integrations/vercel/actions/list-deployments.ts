import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().optional().describe('Filter deployments from the given project ID or name.'),
    app: z.string().optional().describe('Name of the deployment.'),
    limit: z.number().optional().describe('Maximum number of deployments to list from a request.'),
    since: z.number().optional().describe('Get deployments created after this JavaScript timestamp.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to `until`.')
});

const DeploymentSchema = z
    .object({
        uid: z.string(),
        name: z.string(),
        url: z.string().nullable(),
        created: z.number(),
        createdAt: z.number(),
        projectId: z.string(),
        readyState: z.string(),
        type: z.string(),
        inspectorUrl: z.string().nullable()
    })
    .passthrough();

const PaginationSchema = z.object({
    count: z.number(),
    next: z.number().nullable(),
    prev: z.number().nullable()
});

const ProviderResponseSchema = z.object({
    deployments: z.array(DeploymentSchema),
    pagination: PaginationSchema
});

const OutputSchema = z.object({
    deployments: z.array(DeploymentSchema),
    next: z.number().optional().describe('Timestamp that must be used to request the next page.')
});

const action = createAction({
    description: 'List deployments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.projectId !== undefined) {
            params['projectId'] = input.projectId;
        }
        if (input.app !== undefined) {
            params['app'] = input.app;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.since !== undefined) {
            params['since'] = input.since;
        }
        if (input.cursor !== undefined) {
            params['until'] = input.cursor;
        }

        const response = await nango.get({
            // https://vercel.com/docs/rest-api/deployments/list-deployments
            endpoint: '/v6/deployments',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            deployments: providerResponse.deployments,
            ...(providerResponse.pagination.next != null && { next: providerResponse.pagination.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
