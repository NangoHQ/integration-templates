import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        path: z.string().describe('The path of the file to create or update, relative to the repository root. Example: "docs/README.md"'),
        message: z.string().describe('The commit message for the file creation or update. Example: "Add README"'),
        content: z.string().describe('The new file content, base64-encoded. Example: "SGVsbG8gV29ybGQ=" (the base64 encoding of "Hello World")'),
        branch: z.string().optional().describe('The branch to commit to. Defaults to the repository\'s default branch when omitted. Example: "master"'),
        sha: z
            .string()
            .optional()
            .describe(
                'The blob SHA of the file being replaced. Required when updating an existing file (obtain it from get-file-content); omit only when creating a brand-new file. Example: "fa1dd213f78d785cfd4db08944d32825a52e3c64"'
            )
    })
    .describe('Input to create or update a file in a GitHub repository via a single commit');

const FileContentSchema = z
    .object({
        name: z.string().describe('The file name. Example: "README.md"'),
        path: z.string().describe('The file path relative to the repository root. Example: "docs/README.md"'),
        sha: z.string().describe('The blob SHA of the file after the commit. Example: "fa1dd213f78d785cfd4db08944d32825a52e3c64"'),
        size: z.number().describe('The file size in bytes. Example: 42'),
        html_url: z.string().optional().describe('The browser URL of the file. Example: "https://github.com/owner/repo/blob/master/README.md"'),
        download_url: z
            .string()
            .optional()
            .describe('The raw download URL of the file. Example: "https://raw.githubusercontent.com/owner/repo/master/README.md"')
    })
    .describe('The created or updated file');

const CommitSchema = z
    .object({
        sha: z.string().describe('The SHA of the created commit. Example: "7638417db6d59f3c431d3e1f261cc637155684cd"'),
        message: z.string().describe('The commit message. Example: "Add README"'),
        html_url: z
            .string()
            .optional()
            .describe('The browser URL of the commit. Example: "https://github.com/owner/repo/commit/7638417db6d59f3c431d3e1f261cc637155684cd"')
    })
    .describe('The commit that created or updated the file');

const OutputSchema = z
    .object({
        content: FileContentSchema,
        commit: CommitSchema
    })
    .describe('The created or updated file and the commit that introduced the change');

const ProviderFileContentSchema = z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
    html_url: z.string().nullable().optional(),
    download_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    content: ProviderFileContentSchema.nullable().optional(),
    commit: z.object({
        sha: z.string(),
        message: z.string(),
        html_url: z.string().nullable().optional()
    })
});

/**
 * @tags: [write]
 * @tagReason: Creates a commit on the provider that creates a new file or updates an existing one.
 * @pitfalls: The sha input is required when updating an existing file and must be omitted when creating a new one, otherwise GitHub returns 422. Updating a file with unchanged content still creates a new commit, and the file's blob sha stays the same. Commits made through this endpoint by a GitHub App are auto-signed by GitHub, so the resulting commit's committer appears as GitHub rather than the app's bot identity.
 */
const action = createAction({
    description: 'Create a new file, or update an existing one, via a single commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/repos/contents#create-or-update-file-contents
        const response = await nango.put({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${input.path
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/')}`,
            data: {
                message: input.message,
                content: input.content,
                ...(input.branch !== undefined && { branch: input.branch }),
                ...(input.sha !== undefined && { sha: input.sha })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.content) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'GitHub did not return the created or updated file content.',
                path: input.path
            });
        }

        return {
            content: {
                name: parsed.content.name,
                path: parsed.content.path,
                sha: parsed.content.sha,
                size: parsed.content.size,
                ...(parsed.content.html_url != null && { html_url: parsed.content.html_url }),
                ...(parsed.content.download_url != null && { download_url: parsed.content.download_url })
            },
            commit: {
                sha: parsed.commit.sha,
                message: parsed.commit.message,
                ...(parsed.commit.html_url != null && { html_url: parsed.commit.html_url })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
