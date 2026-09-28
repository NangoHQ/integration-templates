import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner (user or organization login). Example: "NangoHQ"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        path: z.string().describe('Path of the file to delete, relative to the repository root. Example: "docs/README.md"'),
        message: z.string().describe('Commit message for the delete commit. Example: "Remove outdated README"'),
        sha: z
            .string()
            .describe(
                'Blob SHA of the file\'s current revision, as returned by get-file-content. Must match exactly or the delete fails. Example: "e21396a27fd682f410513589881ad32deee6fbef"'
            ),
        branch: z.string().optional().describe('Branch to delete the file from. Defaults to the repository\'s default branch when omitted. Example: "main"')
    })
    .describe('Input for deleting a file from a GitHub repository');

const CommitSchema = z
    .object({
        sha: z.string().describe('SHA of the commit that deleted the file. Example: "7638417db6d59f3c431d3e1f261cc637155684cd"'),
        message: z.string().describe('Message of the commit that deleted the file'),
        url: z.string().describe('API URL of the commit that deleted the file'),
        html_url: z.string().describe('Browser URL of the commit that deleted the file')
    })
    .describe('Commit that deleted the file');

const OutputSchema = z
    .object({
        commit: CommitSchema
    })
    .describe('Result of deleting a file from a GitHub repository');

const GitHubDeleteFileResponseSchema = z.object({
    commit: z.object({
        sha: z.string(),
        message: z.string(),
        url: z.string(),
        html_url: z.string()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a file from the repository by creating a commit, a write whose removal is not trivially reversible.
 * @pitfalls: The sha must be the file's current blob SHA, so fetch it fresh before deleting; a stale or mismatched SHA is rejected with a 409 conflict. When branch is omitted the file is deleted from the repository's default branch. Unlike file create/update commits, delete commits are not auto-signed by GitHub: the committer is the app's own bot identity and the commit shows as unverified.
 */
const action = createAction({
    description: 'Deletes a file from a GitHub repository via a single commit',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/repos/contents#delete-a-file
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${input.path.split('/').map(encodeURIComponent).join('/')}`,
            data: {
                message: input.message,
                sha: input.sha,
                ...(input.branch !== undefined && { branch: input.branch })
            },
            retries: 3
        };
        const response = await nango.delete(config);
        const deleted = GitHubDeleteFileResponseSchema.parse(response.data);

        return {
            commit: deleted.commit
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
