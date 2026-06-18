import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    node: z.string().describe('Full or abbreviated commit SHA. Example: "abc123"')
});

const AuthorSchema = z.object({
    raw: z.string().optional(),
    type: z.string().optional(),
    user: z
        .object({
            display_name: z.string().optional(),
            uuid: z.string().optional(),
            account_id: z.string().optional(),
            type: z.string().optional()
        })
        .optional()
});

const ParentSchema = z.object({
    hash: z.string().optional(),
    type: z.string().optional()
});

const SummarySchema = z.object({
    raw: z.string().optional(),
    markup: z.string().optional(),
    html: z.string().optional(),
    type: z.string().optional()
});

const CommitSchema = z.object({
    hash: z.string(),
    type: z.string().optional(),
    message: z.string().optional(),
    author: AuthorSchema.optional(),
    date: z.string().optional(),
    parents: z.array(ParentSchema).optional(),
    summary: SummarySchema.optional()
});

const OutputSchema = z.object({
    hash: z.string(),
    type: z.string().optional(),
    message: z.string().optional(),
    author: AuthorSchema.optional(),
    date: z.string().optional(),
    parents: z.array(ParentSchema).optional(),
    summary: SummarySchema.optional()
});

const action = createAction({
    description: 'Retrieve a single commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/#api-repositories-workspace-repo-slug-commit-node-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/commit/${encodeURIComponent(input.node)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Commit not found',
                workspace: input.workspace,
                repo_slug: input.repo_slug,
                node: input.node
            });
        }

        const commit = CommitSchema.parse(response.data);

        return {
            hash: commit.hash,
            ...(commit.type !== undefined && { type: commit.type }),
            ...(commit.message !== undefined && { message: commit.message }),
            ...(commit.author !== undefined && { author: commit.author }),
            ...(commit.date !== undefined && { date: commit.date }),
            ...(commit.parents !== undefined && { parents: commit.parents }),
            ...(commit.summary !== undefined && { summary: commit.summary })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
