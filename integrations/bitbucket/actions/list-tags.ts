import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    q: z.string().optional().describe('Query string to filter tags. Example: \'name ~ "v1.*"\''),
    sort: z.string().optional().describe('Sort field. Example: "-name"'),
    pagelen: z.number().optional().describe('Number of items per page (max 100). Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ProviderTagSchema = z
    .object({
        name: z.string(),
        type: z.string().optional(),
        links: z.record(z.string(), z.unknown()).optional(),
        target: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    pagelen: z.number().optional(),
    page: z.number().optional(),
    size: z.number().optional(),
    values: z.array(z.unknown()),
    next: z.string().optional()
});

const OutputSchema = z.object({
    tags: z.array(ProviderTagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags for a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.q !== undefined) {
            params['q'] = input.q;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.pagelen !== undefined) {
            params['pagelen'] = input.pagelen;
        }
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/#api-repositories-workspace-repo-slug-refs-tags-get
        const response = await nango.get({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/refs/tags`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const tags = providerResponse.values.map((item) => ProviderTagSchema.parse(item));

        let nextCursor: string | undefined;
        if (providerResponse.next) {
            const nextUrl = new URL(providerResponse.next);
            const nextPage = nextUrl.searchParams.get('page');
            if (nextPage) {
                nextCursor = nextPage;
            }
        }

        return {
            tags,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
