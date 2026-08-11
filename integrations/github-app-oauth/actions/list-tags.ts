import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        per_page: z.number().optional().describe('Number of results per page. Maximum 100.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input to list tags in a GitHub repository.');

const TagCommitSchema = z.object({
    sha: z.string().describe('SHA of the commit the tag points to.'),
    url: z.string().describe('API URL for the commit.')
});

const TagSchema = z.object({
    name: z.string().describe('Tag name. Example: "v1.0.0"'),
    zipball_url: z.string().describe('URL to download the repository as a zip archive at this tag.'),
    tarball_url: z.string().describe('URL to download the repository as a tar archive at this tag.'),
    commit: TagCommitSchema.describe('Commit the tag points to.'),
    node_id: z.string().describe('Global node ID for the tag.')
});

const OutputSchema = z
    .object({
        items: z.array(TagSchema).describe('List of tags in the repository.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Omit if there are no more pages.')
    })
    .describe('Output containing the list of repository tags and an optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Lists existing git tags from the provider without modifying repository state.
 * @pitfalls: Git tags created automatically by releases survive release deletion and continue to appear in results.
 */
const action = createAction({
    description: 'List tags in a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 30;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number'
            });
        }

        const response = await nango.get({
            // https://docs.github.com/en/rest/repos/repos#list-repository-tags
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/tags`,
            params: {
                per_page: String(perPage),
                page: String(page)
            },
            retries: 3
        });

        const linkHeader = response.headers?.['link'];
        const hasNextPage = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        const items = z
            .array(
                z.object({
                    name: z.string(),
                    zipball_url: z.string(),
                    tarball_url: z.string(),
                    commit: z.object({
                        sha: z.string(),
                        url: z.string()
                    }),
                    node_id: z.string()
                })
            )
            .parse(response.data);

        return {
            items: items.map((item) => ({
                name: item.name,
                zipball_url: item.zipball_url,
                tarball_url: item.tarball_url,
                commit: {
                    sha: item.commit.sha,
                    url: item.commit.url
                },
                node_id: item.node_id
            })),
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
