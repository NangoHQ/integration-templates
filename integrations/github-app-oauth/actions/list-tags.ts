import { z } from 'zod';
import { createAction } from 'nango';

const CommitSchema = z.object({
    sha: z.string().describe('The SHA of the commit this tag points to.'),
    url: z.string().describe('The API URL for the commit.')
});

const TagSchema = z.object({
    name: z.string().describe('The name of the tag.'),
    commit: CommitSchema.describe('The commit the tag points to.'),
    zipball_url: z.string().describe('The URL to download the repository as a zip archive at this tag.'),
    tarball_url: z.string().describe('The URL to download the repository as a tar archive at this tag.'),
    node_id: z.string().describe('The global node ID for the tag.')
});

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository without the .git extension.'),
        per_page: z.number().max(100).optional().describe('The number of results per page (max 100).'),
        cursor: z.string().optional().describe('The page number of the results to fetch. Omit for the first page.')
    })
    .describe('Input parameters for listing repository tags.');

const OutputSchema = z
    .object({
        items: z.array(TagSchema).describe('Array of tags in the repository.'),
        next_cursor: z.string().optional().describe('The next page cursor. Omit when there are no more pages.')
    })
    .describe('Output for listing repository tags.');

/**
 * @tags: [read]
 * @tagReason: Reads repository tags from the GitHub API.
 * @pitfalls: Tags are returned in reverse alphabetical order by name, not chronological or semantic-version order.
 */
const action = createAction({
    description: 'List tags in a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 30;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (input.cursor && (isNaN(page) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number.'
            });
        }

        // https://docs.github.com/rest/repos/repos#list-repository-tags
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/tags`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const tags = z.array(TagSchema).parse(response.data);

        const linkHeader = response.headers?.['link'];
        const hasNextPage = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        return {
            items: tags,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
