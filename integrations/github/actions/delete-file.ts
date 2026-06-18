import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    path: z.string().describe('The path to the file in the repository. Example: "path/to/file.txt"'),
    message: z.string().describe('The commit message. Example: "Delete file.txt"'),
    sha: z.string().describe('The blob SHA of the file being deleted. Example: "sha256hash"'),
    branch: z.string().describe('The name of the branch to delete the file from. Example: "main"')
});

const CommitUserSchema = z.object({
    date: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional()
});

const CommitTreeSchema = z.object({
    sha: z.string().optional(),
    url: z.string().optional()
});

const CommitVerificationSchema = z.object({
    payload: z.string().nullable().optional(),
    reason: z.string().optional(),
    signature: z.string().nullable().optional(),
    verified: z.boolean().optional()
});

const CommitSchema = z.object({
    author: CommitUserSchema.optional(),
    committer: CommitUserSchema.optional(),
    html_url: z.string().optional(),
    message: z.string().optional(),
    node_id: z.string().optional(),
    parents: z
        .array(
            z.object({
                html_url: z.string().optional(),
                sha: z.string().optional(),
                url: z.string().optional()
            })
        )
        .optional(),
    sha: z.string().optional(),
    tree: CommitTreeSchema.optional(),
    url: z.string().optional(),
    verification: CommitVerificationSchema.optional()
});

const ProviderResponseSchema = z.object({
    commit: CommitSchema.optional(),
    content: z.unknown().optional()
});

const OutputSchema = z.object({
    commit: z
        .object({
            sha: z.string().optional(),
            message: z.string().optional(),
            html_url: z.string().optional(),
            author: CommitUserSchema.optional(),
            committer: CommitUserSchema.optional(),
            tree: CommitTreeSchema.optional(),
            parents: z
                .array(
                    z.object({
                        sha: z.string().optional(),
                        html_url: z.string().optional(),
                        url: z.string().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Delete a file from a repository branch.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/repos/contents#delete-a-file
        const encodedPath = input.path.split('/').map(encodeURIComponent).join('/');
        const response = await nango.delete({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encodedPath}`,
            data: {
                message: input.message,
                sha: input.sha,
                branch: input.branch
            },
            retries: 1
        });

        const responseData = ProviderResponseSchema.safeParse(response.data);
        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from GitHub API',
                issues: responseData.error.issues
            });
        }

        const data = responseData.data;
        const commit = data.commit;

        if (!commit) {
            return { commit: undefined };
        }

        return {
            commit: {
                sha: commit.sha,
                message: commit.message,
                html_url: commit.html_url,
                author: commit.author,
                committer: commit.committer,
                tree: commit.tree,
                parents: commit.parents?.map((parent) => ({
                    sha: parent.sha,
                    html_url: parent.html_url,
                    url: parent.url
                }))
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
