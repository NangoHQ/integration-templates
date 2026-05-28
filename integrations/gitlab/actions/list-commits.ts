import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('The ID of the project. Example: 82599306'),
    ref_name: z.string().optional().describe('The name of a repository branch or tag. If not given, the default branch is used.'),
    path: z.string().optional().describe('The file path. Example: hello.txt'),
    since: z.string().optional().describe('Only commits after this date. Format: ISO 8601 (YYYY-MM-DDTHH:MM:SSZ).'),
    until: z.string().optional().describe('Only commits before this date. Format: ISO 8601 (YYYY-MM-DDTHH:MM:SSZ).'),
    per_page: z.number().optional().describe('Number of results per page. Default: 20, max: 100.'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ProviderCommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    created_at: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const CommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    created_at: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const OutputSchema = z.object({
    commits: z.array(CommitSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List commits from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-commits',
        group: 'Commits'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.gitlab.com/api/commits/#list-repository-commits
        const response = await nango.get({
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/repository/commits`,
            params: {
                ...(input.ref_name !== undefined && { ref_name: input.ref_name }),
                ...(input.path !== undefined && { path: input.path }),
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const unknownItems = z.array(z.unknown()).parse(response.data);
        const commits = unknownItems.map((item) => {
            const commit = ProviderCommitSchema.parse(item);
            return {
                id: commit.id,
                ...(commit.short_id !== undefined && { short_id: commit.short_id }),
                ...(commit.title !== undefined && { title: commit.title }),
                ...(commit.message !== undefined && { message: commit.message }),
                ...(commit.author_name !== undefined && { author_name: commit.author_name }),
                ...(commit.author_email !== undefined && { author_email: commit.author_email }),
                ...(commit.authored_date !== undefined && { authored_date: commit.authored_date }),
                ...(commit.committer_name !== undefined && { committer_name: commit.committer_name }),
                ...(commit.committer_email !== undefined && { committer_email: commit.committer_email }),
                ...(commit.committed_date !== undefined && { committed_date: commit.committed_date }),
                ...(commit.created_at !== undefined && { created_at: commit.created_at }),
                ...(commit.parent_ids !== undefined && { parent_ids: commit.parent_ids }),
                ...(commit.web_url !== undefined && { web_url: commit.web_url })
            };
        });

        const nextPage =
            typeof response.headers['x-next-page'] === 'string' && response.headers['x-next-page'] !== '' ? response.headers['x-next-page'] : undefined;

        return {
            commits,
            ...(nextPage !== undefined && { next_cursor: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
