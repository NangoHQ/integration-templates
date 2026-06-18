import { createAction } from 'nango';
import { z } from 'zod';

const GitRefSchema = z
    .object({
        name: z.string(),
        objectId: z.string(),
        creator: z
            .object({
                displayName: z.string().optional(),
                id: z.string().optional()
            })
            .optional(),
        url: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    project: z.string(),
    repositoryId: z.string(),
    continuationToken: z.string().optional()
});

const OutputSchema = z.object({
    branches: z.array(GitRefSchema),
    nextContinuationToken: z.string().optional()
});

export default createAction({
    description: 'List Git branches (refs/heads) in a repository',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/list-branches' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code'],
    exec: async (nango, input) => {
        const params: Record<string, string> = {
            filter: 'heads/',
            'api-version': '7.2-preview.1'
        };

        if (input.continuationToken) {
            params['continuationToken'] = input.continuationToken;
        }

        const endpoint = `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/refs`;

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/refs/list?view=azure-devops-rest-7.2
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        const body = response.data;
        if (typeof body !== 'object' || body === null || !Array.isArray(body.value)) {
            throw new nango.ActionError({
                message: 'Unexpected response from Azure DevOps API'
            });
        }

        const branches = [];
        for (const item of body.value) {
            const parsed = GitRefSchema.safeParse(item);
            if (parsed.success) {
                branches.push(parsed.data);
            }
        }

        const headers = response.headers;
        const nextContinuationToken =
            typeof headers === 'object' && headers !== null && 'x-ms-continuationtoken' in headers && typeof headers['x-ms-continuationtoken'] === 'string'
                ? headers['x-ms-continuationtoken']
                : undefined;

        return {
            branches,
            nextContinuationToken
        };
    }
});
