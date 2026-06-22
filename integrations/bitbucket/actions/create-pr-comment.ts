import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    pull_request_id: z.number().describe('Pull request ID. Example: 1'),
    content: z.string().describe('Comment content in raw markdown. Example: "This is a comment"'),
    inline_path: z.string().optional().describe('File path for inline comment. Example: "README.md"'),
    inline_from: z.number().optional().describe('Starting line for inline comment. Example: 1'),
    inline_to: z.number().optional().describe('Ending line for inline comment. Example: 5')
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    content: z
        .object({
            raw: z.string().optional(),
            markup: z.string().optional(),
            html: z.string().optional()
        })
        .passthrough()
        .optional(),
    user: z
        .object({
            type: z.string().optional(),
            uuid: z.string().optional(),
            display_name: z.string().optional(),
            account_id: z.string().optional()
        })
        .passthrough()
        .optional(),
    inline: z
        .object({
            path: z.string().optional(),
            from: z.number().optional(),
            to: z.number().optional()
        })
        .optional(),
    pullrequest: z
        .object({
            id: z.number().optional(),
            type: z.string().optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = ProviderCommentSchema;

const action = createAction({
    description: 'Add a comment to a pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            content: {
                raw: input.content
            }
        };

        if (input.inline_path !== undefined || input.inline_from !== undefined || input.inline_to !== undefined) {
            const inline: Record<string, unknown> = {};
            if (input.inline_path !== undefined) {
                inline['path'] = input.inline_path;
            }
            if (input.inline_from !== undefined) {
                inline['from'] = input.inline_from;
            }
            if (input.inline_to !== undefined) {
                inline['to'] = input.inline_to;
            }
            body['inline'] = inline;
        }

        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-comments-post
            endpoint: `/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/${encodeURIComponent(String(input.pull_request_id))}/comments`,
            data: body,
            retries: 1,
            baseUrlOverride: 'https://api.bitbucket.org/2.0'
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create pull request comment: empty response from Bitbucket'
            });
        }

        const parsed = ProviderCommentSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Bitbucket comment response',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
