import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username or organization name.'),
        repo: z.string().describe('Repository name.'),
        pull_number: z.number().int().describe('Pull request number.'),
        cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Defaults to 30 if omitted.')
    })
    .describe('Input parameters for listing files changed in a pull request.');

const FileSchema = z.object({
    sha: z.string().describe('SHA hash of the file blob.'),
    filename: z.string().describe('Name of the file.'),
    status: z.string().describe('Status of the file change (e.g., added, removed, modified).'),
    additions: z.number().int().describe('Number of lines added in the file.'),
    deletions: z.number().int().describe('Number of lines deleted in the file.'),
    changes: z.number().int().describe('Total number of changes in the file.'),
    patch: z.string().optional().describe('Unified diff patch of the file change.'),
    previous_filename: z.string().optional().describe('Previous filename if the file was renamed.'),
    blob_url: z.string().optional().describe('URL to view the file blob on GitHub.'),
    raw_url: z.string().optional().describe('URL to the raw file contents.'),
    contents_url: z.string().optional().describe('URL to the file contents API endpoint.')
});

const OutputSchema = z
    .object({
        items: z.array(FileSchema).describe('Array of files changed in the pull request.'),
        next_cursor: z.string().optional().describe('Pagination cursor to retrieve the next page of results.')
    })
    .describe('List of files changed in a pull request, with optional pagination cursor.');

const ProviderFileSchema = z.object({
    sha: z.string().nullish(),
    filename: z.string().nullish(),
    status: z.string().nullish(),
    additions: z.number().int().nullish(),
    deletions: z.number().int().nullish(),
    changes: z.number().int().nullish(),
    patch: z.string().nullish(),
    previous_filename: z.string().nullish(),
    blob_url: z.string().nullish(),
    raw_url: z.string().nullish(),
    contents_url: z.string().nullish()
});

function extractNextCursor(linkHeader: string | string[] | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const header = Array.isArray(linkHeader) ? linkHeader.join(',') : linkHeader;
    const match = header.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel=["']next["']/);
    if (match) {
        return match[1];
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads the list of files changed in a pull request.
 * @pitfalls: GitHub limits this endpoint to 300 changed files; larger pull requests require the GraphQL API.
 */
const action = createAction({
    description: 'List the files changed in a pull request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const params: Record<string, string | number> = {
            page
        };
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-request-files
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/files`,
            params,
            retries: 3
        });

        const items = z.array(z.unknown()).parse(response.data);
        const parsedItems = items.map((item: unknown) => {
            const raw = ProviderFileSchema.parse(item);
            return {
                sha: raw.sha ?? '',
                filename: raw.filename ?? '',
                status: raw.status ?? '',
                additions: raw.additions ?? 0,
                deletions: raw.deletions ?? 0,
                changes: raw.changes ?? 0,
                ...(raw.patch != null && { patch: raw.patch }),
                ...(raw.previous_filename != null && { previous_filename: raw.previous_filename }),
                ...(raw.blob_url != null && { blob_url: raw.blob_url }),
                ...(raw.raw_url != null && { raw_url: raw.raw_url }),
                ...(raw.contents_url != null && { contents_url: raw.contents_url })
            };
        });

        const linkHeader = response.headers['link'] || response.headers['Link'];
        const nextCursor = extractNextCursor(linkHeader);

        return {
            items: parsedItems,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
