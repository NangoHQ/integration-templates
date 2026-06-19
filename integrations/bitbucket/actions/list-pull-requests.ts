import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    state: z
        .array(z.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']))
        .optional()
        .describe('Filter by pull request state. Defaults to OPEN only if omitted.'),
    q: z.string().optional().describe('Query string to filter results. Example: "title~\\"test\\""'),
    sort: z.string().optional().describe('Sort field. Example: "-created_on"'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const PullRequestSchema = z
    .object({
        id: z.number(),
        title: z.string(),
        state: z.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']),
        author: z
            .object({
                type: z.string(),
                display_name: z.string().optional(),
                uuid: z.string().optional(),
                account_id: z.string().optional()
            })
            .passthrough()
            .optional(),
        source: z.unknown().optional(),
        destination: z.unknown().optional(),
        merge_commit: z.object({ hash: z.string() }).nullable().optional(),
        comment_count: z.number().optional(),
        task_count: z.number().optional(),
        close_source_branch: z.boolean().optional(),
        closed_by: z.object({ type: z.string() }).passthrough().nullable().optional(),
        reason: z.string().optional(),
        created_on: z.string().optional(),
        updated_on: z.string().optional(),
        reviewers: z.array(z.unknown()).optional(),
        participants: z.array(z.unknown()).optional(),
        draft: z.boolean().optional(),
        queued: z.boolean().optional(),
        mergeable: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(PullRequestSchema),
    next_cursor: z.string().optional()
});

function extractNextCursor(nextUrl: string | undefined): string | undefined {
    if (!nextUrl) {
        return undefined;
    }
    // @allowTryCatch new URL() can throw on malformed input; we fall back to returning the raw next URL.
    try {
        const url = new URL(nextUrl);
        const page = url.searchParams.get('page');
        if (page) {
            return page;
        }
    } catch {
        // If URL parsing fails, return the raw string
    }
    return nextUrl;
}

const action = createAction({
    description: 'List pull requests for a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};
        if (input.state && input.state.length > 0) {
            params['state'] = input.state;
        }
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
            const pageNum = parseInt(input.cursor, 10);
            if (!isNaN(pageNum)) {
                params['page'] = pageNum;
            }
        }

        const endpoint = `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests`;

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-get
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            size: z.number().optional(),
            page: z.number().optional(),
            pagelen: z.number().optional(),
            next: z.string().optional(),
            previous: z.string().optional(),
            values: z.array(z.unknown())
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.values.map((item: unknown) => PullRequestSchema.parse(item));

        return {
            items,
            ...(extractNextCursor(parsed.next) !== undefined && { next_cursor: extractNextCursor(parsed.next) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
