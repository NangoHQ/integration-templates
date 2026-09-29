import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "2"'),
        per_page: z.number().optional().describe('Number of results per page (max 100). Defaults to 30.')
    })
    .describe('Input for listing releases in a repository.');

const ReleaseSchema = z.object({
    id: z.number().describe('Release ID.'),
    tag_name: z.string().describe('Git tag associated with the release.'),
    name: z.string().nullable().optional().describe('Release name.'),
    body: z.string().nullable().optional().describe('Release description body.'),
    draft: z.boolean().describe('Whether this is a draft release.'),
    prerelease: z.boolean().describe('Whether this is a prerelease.'),
    created_at: z.string().describe('ISO 8601 timestamp when the release was created.'),
    published_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the release was published.'),
    author_login: z.string().nullable().optional().describe('Login of the release author.'),
    html_url: z.string().describe('URL to view the release in a browser.'),
    url: z.string().describe('API URL for the release.')
});

const OutputSchema = z
    .object({
        releases: z.array(ReleaseSchema).describe('Array of releases for the repository.'),
        next_cursor: z.string().optional().describe('Cursor for the next page of results. Absent when there are no more pages.')
    })
    .describe('Output for listing releases in a repository.');

/**
 * @tags: [read]
 * @tagReason: Reads release metadata from the GitHub API.
 */
const action = createAction({
    description: 'List releases for a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases`,
            params,
            retries: 3
        });

        const releases = z
            .array(
                z.object({
                    id: z.number(),
                    tag_name: z.string(),
                    name: z.string().nullable().optional(),
                    body: z.string().nullable().optional(),
                    draft: z.boolean(),
                    prerelease: z.boolean(),
                    created_at: z.string(),
                    published_at: z.string().nullable().optional(),
                    author: z
                        .object({
                            login: z.string()
                        })
                        .nullable()
                        .optional(),
                    html_url: z.string(),
                    url: z.string()
                })
            )
            .parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string') {
            const match = linkHeader.match(/<[^>]*[?&]page=([^&>]*)[^>]*>;\s*rel="next"/);
            if (match) {
                next_cursor = match[1];
            }
        }

        return {
            releases: releases.map((release) => ({
                id: release.id,
                tag_name: release.tag_name,
                ...(release.name != null && { name: release.name }),
                ...(release.body != null && { body: release.body }),
                draft: release.draft,
                prerelease: release.prerelease,
                created_at: release.created_at,
                ...(release.published_at != null && { published_at: release.published_at }),
                ...(release.author != null && release.author.login != null && { author_login: release.author.login }),
                html_url: release.html_url,
                url: release.url
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
