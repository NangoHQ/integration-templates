import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        pull_number: z.number().int().describe('Pull request number. Example: 1'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum 100. Defaults to 30.')
    })
    .describe('Input parameters for listing pull request files');

const ProviderFileSchema = z.object({
    sha: z.string(),
    filename: z.string(),
    status: z.string(),
    additions: z.number().int(),
    deletions: z.number().int(),
    changes: z.number().int(),
    blob_url: z.string(),
    raw_url: z.string(),
    contents_url: z.string(),
    patch: z.string().optional(),
    previous_filename: z.string().optional()
});

const OutputSchema = z
    .object({
        files: z
            .array(
                z.object({
                    sha: z.string().describe('SHA hash of the file blob.'),
                    filename: z.string().describe('Name of the file.'),
                    status: z.string().describe('Status of the file change (added, removed, modified, renamed, copied, changed, unchanged).'),
                    additions: z.number().int().describe('Number of lines added.'),
                    deletions: z.number().int().describe('Number of lines deleted.'),
                    changes: z.number().int().describe('Total number of changes.'),
                    blob_url: z.string().describe('URL to view the blob.'),
                    raw_url: z.string().describe('URL to the raw file content.'),
                    contents_url: z.string().describe('URL to the file contents API endpoint.'),
                    patch: z.string().optional().describe('Patch diff text for the file change.'),
                    previous_filename: z.string().optional().describe('Previous filename if the file was renamed.')
                })
            )
            .describe('Array of files changed in the pull request.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Omitted when there are no more pages.')
    })
    .describe('Output containing the list of changed files and pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of files changed in an existing pull request.
 * @pitfalls: This endpoint returns a maximum of 3000 changed files per pull request; larger diffs are silently truncated.
 */
const action = createAction({
    description: 'List the files changed in a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a positive integer representing a page number.'
            });
        }

        const perPage = input.per_page ?? 30;

        // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests-files
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/files`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const files = z.array(ProviderFileSchema).parse(response.data);

        return {
            files: files.map((file) => ({
                sha: file.sha,
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                blob_url: file.blob_url,
                raw_url: file.raw_url,
                contents_url: file.contents_url,
                ...(file.patch !== undefined && { patch: file.patch }),
                ...(file.previous_filename !== undefined && { previous_filename: file.previous_filename })
            })),
            ...(files.length === perPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
