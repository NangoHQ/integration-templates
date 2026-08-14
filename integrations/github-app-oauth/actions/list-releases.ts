import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner (user or organization).'),
        repo: z.string().describe('Repository name.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100).'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
    })
    .describe('Input to list releases for a GitHub repository.');

const ReleaseSchema = z
    .object({
        id: z.number().describe('Release ID.'),
        tag_name: z.string().describe('Git tag associated with the release.'),
        name: z.string().nullable().describe('Name of the release.'),
        body: z.string().nullable().describe('Description of the release.'),
        draft: z.boolean().describe('Whether the release is a draft.'),
        prerelease: z.boolean().describe('Whether the release is a prerelease.'),
        created_at: z.string().describe('ISO 8601 timestamp when the release was created.'),
        published_at: z.string().nullable().describe('ISO 8601 timestamp when the release was published.'),
        html_url: z.string().describe('URL to view the release in a browser.'),
        author_login: z.string().optional().describe('Login of the user who authored the release.')
    })
    .describe('A GitHub release.');

const OutputSchema = z
    .object({
        releases: z.array(ReleaseSchema).describe('List of releases for the repository.'),
        next_cursor: z.string().optional().describe('Cursor to retrieve the next page of results.')
    })
    .describe('Output containing a paginated list of GitHub releases.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of releases from the GitHub API.
 * @pitfalls: Returns GitHub releases only; git tags without an associated release are omitted, so an empty result does not mean the repository has no tags.
 */
const action = createAction({
    description: 'List releases for a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const perPage = input.per_page ?? 30;

        // https://docs.github.com/en/rest/releases/releases#list-releases
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerReleases = z
            .array(
                z.object({
                    id: z.number(),
                    tag_name: z.string(),
                    name: z.string().nullable(),
                    body: z.string().nullable(),
                    draft: z.boolean(),
                    prerelease: z.boolean(),
                    created_at: z.string(),
                    published_at: z.string().nullable(),
                    html_url: z.string(),
                    author: z
                        .object({
                            login: z.string()
                        })
                        .optional()
                })
            )
            .parse(response.data);

        const releases = providerReleases.map((release) => ({
            id: release.id,
            tag_name: release.tag_name,
            name: release.name,
            body: release.body,
            draft: release.draft,
            prerelease: release.prerelease,
            created_at: release.created_at,
            published_at: release.published_at,
            html_url: release.html_url,
            ...(release.author && { author_login: release.author.login })
        }));

        const linkHeader = typeof response.headers?.['link'] === 'string' ? response.headers['link'] : '';
        const hasNext = linkHeader.includes('rel="next"');
        const next_cursor = hasNext ? String(page + 1) : undefined;

        return {
            releases,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
