import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10')
});

const ProviderUserSchema = z.object({
    type: z.string().optional(),
    uuid: z.string(),
    username: z.string().optional(),
    display_name: z.string().optional(),
    account_id: z.string().optional()
});

const ProviderResponseSchema = z.object({
    values: z.array(ProviderUserSchema),
    next: z.string().optional()
});

const WatcherSchema = z.object({
    uuid: z.string(),
    username: z.string().optional(),
    display_name: z.string().optional(),
    account_id: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    watchers: z.array(WatcherSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List users watching a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-watchers-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/watchers`,
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.pagelen !== undefined && { pagelen: input.pagelen })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const watchers = parsed.values.map((user) => {
            return {
                uuid: user.uuid,
                ...(user.username !== undefined && { username: user.username }),
                ...(user.display_name !== undefined && { display_name: user.display_name }),
                ...(user.account_id !== undefined && { account_id: user.account_id }),
                ...(user.type !== undefined && { type: user.type })
            };
        });

        let nextCursor: string | undefined;
        if (parsed.next) {
            const url = new URL(parsed.next);
            const pageParam = url.searchParams.get('page');
            if (pageParam !== null) {
                nextCursor = pageParam;
            }
        }

        return {
            watchers,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
