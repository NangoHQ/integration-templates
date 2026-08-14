import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        path: z.string().describe('File path within the repository. Example: "docs/readme.md"'),
        message: z.string().describe('Commit message for the file change.'),
        content: z.string().describe('Raw file content. The action base64-encodes it before sending to GitHub.'),
        branch: z.string().describe('Branch name where the file should be created or updated. Example: "main"'),
        sha: z.string().optional().describe('Blob SHA of the existing file. Required when updating an existing file; omit when creating a new file.')
    })
    .describe('Input for creating or updating a single file in a repository via a commit.');

const ProviderContentSchema = z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
    html_url: z.string(),
    download_url: z.string().optional().nullable()
});

const ProviderCommitSchema = z.object({
    sha: z.string(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    content: ProviderContentSchema,
    commit: ProviderCommitSchema
});

const OutputSchema = z
    .object({
        content_name: z.string().describe('Name of the file.'),
        content_path: z.string().describe('Path of the file in the repository.'),
        content_sha: z.string().describe('SHA of the file blob.'),
        content_size: z.number().describe('Size of the file in bytes.'),
        content_html_url: z.string().describe('HTML URL to view the file on GitHub.'),
        content_download_url: z.string().optional().describe('Direct download URL for the file.'),
        commit_sha: z.string().describe('SHA of the commit that created or updated the file.'),
        commit_message: z.string().describe('Message of the commit.')
    })
    .describe('Output of a successful file create or update, including the new file content metadata and the resulting commit.');

/**
 * @tags: [write]
 * @tagReason: Creates or updates a file in the repository via a new commit.
 * @pitfalls: The resulting commit is signed by GitHub and its committer is rewritten to "GitHub <noreply@github.com>" rather than the app's bot identity.
 */
const action = createAction({
    description: 'Create a new file, or update an existing one, via a single commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            message: input.message,
            content: Buffer.from(input.content).toString('base64'),
            branch: input.branch
        };

        if (input.sha !== undefined) {
            body['sha'] = input.sha;
        }

        const encodedPath = input.path.split('/').map(encodeURIComponent).join('/');
        const response = await nango.put({
            // https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encodedPath}`,
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            content_name: parsed.content.name,
            content_path: parsed.content.path,
            content_sha: parsed.content.sha,
            content_size: parsed.content.size,
            content_html_url: parsed.content.html_url,
            ...(parsed.content.download_url != null && { content_download_url: parsed.content.download_url }),
            commit_sha: parsed.commit.sha,
            commit_message: parsed.commit.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
