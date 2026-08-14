import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        path: z.string().describe('The file path to delete within the repository. Example: "path/to/file.md"'),
        message: z.string().describe('The commit message for the deletion. Example: "Delete obsolete file"'),
        sha: z.string().describe('The current blob SHA of the file being deleted. Retrieve this from get-file-content. Example: "abc123..."'),
        branch: z.string().optional().describe("The branch to delete the file from. If omitted, the repository's default branch is used.")
    })
    .describe('Input to delete a file via a single commit.');

const ProviderCommitSchema = z.object({
    sha: z.string(),
    message: z.string(),
    html_url: z.string().optional(),
    author: z.unknown().optional(),
    committer: z.unknown().optional(),
    tree: z.unknown().optional(),
    parents: z.array(z.unknown()).optional(),
    verification: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    content: z.unknown().nullable().optional(),
    commit: ProviderCommitSchema
});

const OutputSchema = z
    .object({
        commit_sha: z.string().describe('SHA of the commit that deleted the file.'),
        commit_message: z.string().describe('Message of the deletion commit.'),
        commit_url: z.string().optional().describe('URL to view the commit in a browser.')
    })
    .describe('Result of deleting a file via a single commit.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a file by creating a new commit that removes it from the repository.
 * @pitfalls: The delete will fail if the file has been modified since the provided SHA was fetched, because GitHub treats the SHA as an optimistic concurrency check.
 */
const deleteFile = createAction({
    description: 'Delete a file via a single commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/repos/contents#delete-a-file
        const encodedPath = input.path.split('/').map(encodeURIComponent).join('/');
        const response = await nango.delete({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encodedPath}`,
            data: {
                message: input.message,
                sha: input.sha,
                ...(input.branch !== undefined && { branch: input.branch })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'GitHub returned an empty response when deleting the file.'
            });
        }

        const result = ProviderResponseSchema.parse(response.data);

        return {
            commit_sha: result.commit.sha,
            commit_message: result.commit.message,
            ...(result.commit.html_url !== undefined && { commit_url: result.commit.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof deleteFile)['exec']>[0];
export default deleteFile;
