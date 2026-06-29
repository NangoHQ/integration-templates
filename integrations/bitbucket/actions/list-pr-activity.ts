import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 20')
});

const PaginatedResponseSchema = z.object({
    size: z.number().optional(),
    page: z.number().optional(),
    pagelen: z.number().optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
    values: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    items: z.array(z.object({}).passthrough()),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the activity log for all pull requests in a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.pagelen !== undefined) {
            params['pagelen'] = input.pagelen;
        }

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-activity-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/activity`,
            params,
            retries: 3
        });

        const parsed = PaginatedResponseSchema.parse(response.data);
        const items = parsed.values || [];

        let nextCursor: string | undefined;
        if (parsed.next) {
            const nextUrl = new URL(parsed.next);
            const nextPage = nextUrl.searchParams.get('page');
            if (nextPage) {
                nextCursor = nextPage;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
