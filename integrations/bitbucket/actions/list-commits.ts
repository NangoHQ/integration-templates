import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    revision: z.string().optional().describe('Optional branch name, tag, or commit hash to filter commits.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CommitParentSchema = z.object({
    type: z.string().optional(),
    hash: z.string()
});

const CommitAuthorUserSchema = z.object({
    display_name: z.string().optional(),
    uuid: z.string().optional(),
    account_id: z.string().optional(),
    type: z.string().optional()
});

const CommitAuthorSchema = z.object({
    raw: z.string().optional(),
    type: z.string().optional(),
    user: CommitAuthorUserSchema.optional()
});

const CommitSummarySchema = z.object({
    raw: z.string().optional(),
    markup: z.string().optional(),
    html: z.string().optional(),
    type: z.string().optional()
});

const CommitSchema = z.object({
    hash: z.string(),
    type: z.string().optional(),
    date: z.string().optional(),
    message: z.string().optional(),
    author: CommitAuthorSchema.optional(),
    summary: CommitSummarySchema.optional(),
    parents: z.array(CommitParentSchema).optional()
});

const OutputSchema = z.object({
    commits: z.array(CommitSchema),
    next_cursor: z.string().optional(),
    size: z.number().optional()
});

const action = createAction({
    description: 'List commits for a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        let params: Record<string, string> | undefined;

        if (input.cursor) {
            const url = new URL(input.cursor);
            endpoint = url.pathname;
            const queryParams: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            params = queryParams;
        } else {
            const revisionPath = input.revision ? `/${encodeURIComponent(input.revision)}` : '';
            endpoint = `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/commits${revisionPath}`;
        }

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/#api-repositories-workspace-repo-slug-commits-get
            endpoint,
            ...(params && { params }),
            retries: 3
        });

        const data = response.data;

        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Invalid response from Bitbucket API.');
        }

        const values = Array.isArray(data.values) ? data.values : [];
        const nextUrl = typeof data.next === 'string' ? data.next : undefined;
        const size = typeof data.size === 'number' ? data.size : undefined;

        const commits = [];
        for (const commit of values) {
            const parsed = CommitSchema.safeParse(commit);
            if (parsed.success) {
                commits.push(parsed.data);
            }
        }

        return {
            commits,
            ...(nextUrl !== undefined && { next_cursor: nextUrl }),
            ...(size !== undefined && { size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
