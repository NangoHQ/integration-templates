import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('The name of the repository. Example: "nango".'),
        path: z.string().describe('The path to the file or directory. Use an empty string for the repository root.'),
        ref: z.string().optional().describe('The name of the commit, branch, or tag. Defaults to the repository default branch if omitted.')
    })
    .describe('Input for retrieving file or directory content from a GitHub repository.');

const ProviderFileSchema = z.object({
    type: z.literal('file'),
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
    content: z.string(),
    html_url: z.string().optional(),
    git_url: z.string().optional(),
    download_url: z.string().optional()
});

const ProviderDirItemSchema = z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
    type: z.enum(['file', 'dir', 'symlink']),
    html_url: z.string().optional(),
    git_url: z.string().optional(),
    download_url: z.string().nullable().optional()
});

const FileOutputSchema = z.object({
    type: z.literal('file').describe('Indicates this response contains a single file.'),
    name: z.string().describe('The file name.'),
    path: z.string().describe('The file path.'),
    sha: z.string().describe('The SHA hash of the file blob.'),
    size: z.number().describe('The file size in bytes.'),
    content: z.string().describe('The decoded file content.'),
    html_url: z.string().optional().describe('The URL to view the file on GitHub.'),
    git_url: z.string().optional().describe('The Git URL of the file.'),
    download_url: z.string().optional().describe('The direct download URL for the file.')
});

const DirectoryOutputSchema = z.object({
    type: z.literal('dir').describe('Indicates this response contains a directory listing.'),
    items: z
        .array(
            z.object({
                name: z.string().describe('The item name.'),
                path: z.string().describe('The item path.'),
                sha: z.string().describe('The SHA hash of the item.'),
                size: z.number().describe('The item size in bytes.'),
                type: z.enum(['file', 'dir', 'symlink']).describe('The type of the item — file, directory, or symlink.'),
                html_url: z.string().optional().describe('The URL to view the item on GitHub.'),
                git_url: z.string().optional().describe('The Git URL of the item.'),
                download_url: z.string().optional().nullable().describe('The direct download URL for the item, if available.')
            })
        )
        .describe('The list of items in the directory.')
});

const OutputSchema = z.union([FileOutputSchema, DirectoryOutputSchema]).describe('The content of a file or a directory listing.');

/**
 * @tags: [read]
 * @tagReason: Retrieves file or directory content from the GitHub API without making any changes.
 * @pitfalls: Files larger than 1 MB cannot be fetched through this endpoint and will error; directory listings are capped at 1,000 items.
 */
const action = createAction({
    description: 'Get the content and metadata of a file (or list a directory) at a given path and ref.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = input.path
            ? `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encodeURIComponent(input.path)}`
            : `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents`;

        const response = await nango.get({
            // https://docs.github.com/rest/repos/contents#get-repository-content
            endpoint,
            params: {
                ...(input.ref !== undefined && { ref: input.ref })
            },
            retries: 3
        });

        const data = response.data;

        if (Array.isArray(data)) {
            const items = ProviderDirItemSchema.array().parse(data);
            return {
                type: 'dir',
                items: items.map((item) => ({
                    name: item.name,
                    path: item.path,
                    sha: item.sha,
                    size: item.size,
                    type: item.type,
                    ...(item.html_url !== undefined && { html_url: item.html_url }),
                    ...(item.git_url !== undefined && { git_url: item.git_url }),
                    ...(item.download_url !== undefined && { download_url: item.download_url })
                }))
            };
        }

        if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'file') {
            const file = ProviderFileSchema.parse(data);
            return {
                type: 'file',
                name: file.name,
                path: file.path,
                sha: file.sha,
                size: file.size,
                content: Buffer.from(file.content, 'base64').toString('utf-8'),
                ...(file.html_url !== undefined && { html_url: file.html_url }),
                ...(file.git_url !== undefined && { git_url: file.git_url }),
                ...(file.download_url !== undefined && { download_url: file.download_url })
            };
        }

        let contentType = 'unknown';
        if (typeof data === 'object' && data !== null && 'type' in data) {
            const val = data.type;
            if (typeof val === 'string') {
                contentType = val;
            }
        }

        throw new nango.ActionError({
            type: 'unsupported_content_type',
            message: 'The requested path does not resolve to a file or directory.',
            content_type: contentType
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
