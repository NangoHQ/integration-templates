import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat".'),
        repo: z.string().describe('The name of the repository. Example: "hello-world".'),
        path: z.string().describe('The path to the file or directory within the repository. Example: "README.md" or "src".'),
        ref: z.string().optional().describe('The name of the commit, branch, or tag. Defaults to the default branch if omitted.')
    })
    .describe('Input for retrieving a file, directory listing, symlink, or submodule from a GitHub repository.');

const DirectoryItemSchema = z.object({
    type: z.enum(['file', 'dir', 'symlink', 'submodule']).describe('The type of the item.'),
    name: z.string().describe('The name of the item.'),
    path: z.string().describe('The path of the item within the repository.'),
    sha: z.string().describe('The SHA of the item.'),
    size: z.number().describe('The size of the item in bytes.'),
    url: z.string().describe('The API URL for the item.'),
    html_url: z.string().optional().describe('The HTML URL to view the item on GitHub.'),
    git_url: z.string().optional().describe('The Git URL for the item.'),
    download_url: z.string().optional().describe('The direct download URL for the item.')
});

const FileOutputSchema = z.object({
    type: z.literal('file').describe('Content type discriminator for a file.'),
    name: z.string().describe('The name of the file.'),
    path: z.string().describe('The path of the file within the repository.'),
    sha: z.string().describe('The SHA of the file blob.'),
    size: z.number().describe('The size of the file in bytes.'),
    content: z.string().optional().describe('The decoded file content. Omitted for large files or if unavailable.'),
    encoding: z.literal('base64').optional().describe('The encoding of the content if present. Always "base64" when content is included.'),
    url: z.string().describe('The API URL for the file.'),
    html_url: z.string().optional().describe('The HTML URL to view the file on GitHub.'),
    git_url: z.string().optional().describe('The Git URL for the file.'),
    download_url: z.string().optional().describe('The direct download URL for the file.')
});

const DirectoryOutputSchema = z.object({
    type: z.literal('directory').describe('Content type discriminator for a directory listing.'),
    entries: z.array(DirectoryItemSchema).describe('The list of items in the directory.')
});

const SymlinkOutputSchema = z.object({
    type: z.literal('symlink').describe('Content type discriminator for a symlink.'),
    name: z.string().describe('The name of the symlink.'),
    path: z.string().describe('The path of the symlink within the repository.'),
    sha: z.string().describe('The SHA of the symlink blob.'),
    size: z.number().describe('The size of the symlink in bytes.'),
    target: z.string().optional().describe('The target path of the symlink.'),
    url: z.string().describe('The API URL for the symlink.'),
    html_url: z.string().optional().describe('The HTML URL to view the symlink on GitHub.'),
    git_url: z.string().optional().describe('The Git URL for the symlink.'),
    download_url: z.string().optional().describe('The direct download URL for the symlink.')
});

const SubmoduleOutputSchema = z.object({
    type: z.literal('submodule').describe('Content type discriminator for a submodule.'),
    name: z.string().describe('The name of the submodule.'),
    path: z.string().describe('The path of the submodule within the repository.'),
    sha: z.string().describe('The SHA of the submodule commit.'),
    size: z.number().describe('The size of the submodule entry in bytes.'),
    submodule_git_url: z.string().optional().describe('The Git URL of the submodule repository.'),
    url: z.string().describe('The API URL for the submodule.'),
    html_url: z.string().optional().describe('The HTML URL to view the submodule on GitHub.'),
    git_url: z.string().optional().describe('The Git URL for the submodule.'),
    download_url: z.string().optional().describe('The direct download URL for the submodule.')
});

const OutputSchema = z
    .union([FileOutputSchema, DirectoryOutputSchema, SymlinkOutputSchema, SubmoduleOutputSchema])
    .describe('Output containing the content and metadata of a file, directory listing, symlink, or submodule from a GitHub repository.');

/**
 * @tags: [read]
 * @tagReason: Retrieves file content, directory listings, or submodule metadata from the GitHub API without modifying repository state.
 * @pitfalls: This endpoint cannot return files larger than 1 MB and limits directory listings to 1,000 entries.
 */
const action = createAction({
    description: 'Get the content and metadata of a file (or list a directory) at a given path and ref.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pathSegments = input.path.split('/').map(encodeURIComponent).join('/');
        const endpoint = pathSegments
            ? `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${pathSegments}`
            : `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents`;

        const response = await nango.get({
            // https://docs.github.com/rest/repos/contents#get-repository-content
            endpoint,
            params: {
                ...(input.ref !== undefined && { ref: input.ref })
            },
            retries: 3
        });

        if (Array.isArray(response.data)) {
            const entries = response.data.map((item: unknown) => {
                const parsed = DirectoryItemSchema.parse(item);
                return {
                    type: parsed.type,
                    name: parsed.name,
                    path: parsed.path,
                    sha: parsed.sha,
                    size: parsed.size,
                    url: parsed.url,
                    ...(parsed.html_url !== undefined && { html_url: parsed.html_url }),
                    ...(parsed.git_url !== undefined && { git_url: parsed.git_url }),
                    ...(parsed.download_url !== undefined && { download_url: parsed.download_url })
                };
            });
            return {
                type: 'directory',
                entries
            };
        }

        const typeData = z.object({ type: z.string() }).parse(response.data);
        const itemType = typeData.type;

        if (itemType === 'file') {
            const file = z
                .object({
                    type: z.literal('file'),
                    name: z.string(),
                    path: z.string(),
                    sha: z.string(),
                    size: z.number(),
                    content: z.string().optional(),
                    encoding: z.literal('base64').optional(),
                    url: z.string(),
                    html_url: z.string().optional(),
                    git_url: z.string().optional(),
                    download_url: z.string().optional()
                })
                .parse(response.data);

            const decodedContent = file.content !== undefined ? Buffer.from(file.content, 'base64').toString('utf-8') : undefined;

            return {
                type: 'file',
                name: file.name,
                path: file.path,
                sha: file.sha,
                size: file.size,
                url: file.url,
                ...(decodedContent !== undefined && { content: decodedContent }),
                ...(file.encoding !== undefined && { encoding: file.encoding }),
                ...(file.html_url !== undefined && { html_url: file.html_url }),
                ...(file.git_url !== undefined && { git_url: file.git_url }),
                ...(file.download_url !== undefined && { download_url: file.download_url })
            };
        }

        if (itemType === 'symlink') {
            const symlink = z
                .object({
                    type: z.literal('symlink'),
                    name: z.string(),
                    path: z.string(),
                    sha: z.string(),
                    size: z.number(),
                    target: z.string().optional(),
                    url: z.string(),
                    html_url: z.string().optional(),
                    git_url: z.string().optional(),
                    download_url: z.string().optional()
                })
                .parse(response.data);

            return {
                type: 'symlink',
                name: symlink.name,
                path: symlink.path,
                sha: symlink.sha,
                size: symlink.size,
                url: symlink.url,
                ...(symlink.target !== undefined && { target: symlink.target }),
                ...(symlink.html_url !== undefined && { html_url: symlink.html_url }),
                ...(symlink.git_url !== undefined && { git_url: symlink.git_url }),
                ...(symlink.download_url !== undefined && { download_url: symlink.download_url })
            };
        }

        if (itemType === 'submodule') {
            const submodule = z
                .object({
                    type: z.literal('submodule'),
                    name: z.string(),
                    path: z.string(),
                    sha: z.string(),
                    size: z.number(),
                    submodule_git_url: z.string().optional(),
                    url: z.string(),
                    html_url: z.string().optional(),
                    git_url: z.string().optional(),
                    download_url: z.string().optional()
                })
                .parse(response.data);

            return {
                type: 'submodule',
                name: submodule.name,
                path: submodule.path,
                sha: submodule.sha,
                size: submodule.size,
                url: submodule.url,
                ...(submodule.submodule_git_url !== undefined && { submodule_git_url: submodule.submodule_git_url }),
                ...(submodule.html_url !== undefined && { html_url: submodule.html_url }),
                ...(submodule.git_url !== undefined && { git_url: submodule.git_url }),
                ...(submodule.download_url !== undefined && { download_url: submodule.download_url })
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_content_type',
            message: `Unexpected content type from GitHub API: ${itemType}`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
