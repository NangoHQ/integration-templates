import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug or UUID. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    pull_request_id: z.number().describe('Pull request ID. Example: 1'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 20')
});

const ParentSchema = z.object({
    id: z.number().optional(),
    type: z.string().optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const CommentSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    content: z
        .object({
            raw: z.string().optional(),
            markup: z.string().optional(),
            html: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    user: z
        .object({
            type: z.string().optional(),
            display_name: z.string().optional(),
            uuid: z.string().optional(),
            account_id: z.string().optional(),
            nickname: z.string().optional(),
            links: z.record(z.string(), z.unknown()).optional()
        })
        .optional(),
    deleted: z.boolean().optional(),
    pending: z.boolean().optional(),
    parent: ParentSchema.optional(),
    inline: z
        .object({
            path: z.string().optional(),
            from: z.number().optional(),
            to: z.number().optional(),
            outdated: z.boolean().optional(),
            context_lines: z.string().optional()
        })
        .optional(),
    links: z.record(z.string(), z.unknown()).optional(),
    pullrequest: z
        .object({
            type: z.string().optional(),
            id: z.number().optional(),
            title: z.string().optional(),
            draft: z.boolean().optional(),
            queued: z.boolean().optional(),
            links: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List comments on a pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-comments-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/${input.pull_request_id}/comments`,
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.pagelen !== undefined && { pagelen: input.pagelen })
            },
            retries: 3
        });

        const paginatedResponse = z
            .object({
                size: z.number().optional(),
                page: z.number().optional(),
                pagelen: z.number().optional(),
                next: z.string().optional(),
                previous: z.string().optional(),
                values: z.array(z.unknown())
            })
            .parse(response.data);

        const comments = paginatedResponse.values.map((item) => CommentSchema.parse(item));

        let nextCursor: string | undefined;
        if (paginatedResponse.next) {
            const nextUrl = new URL(paginatedResponse.next);
            const nextPage = nextUrl.searchParams.get('page');
            if (nextPage) {
                nextCursor = nextPage;
            }
        }

        return {
            comments,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
