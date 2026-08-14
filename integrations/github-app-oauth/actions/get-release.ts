import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        release_id: z.number().int().positive().describe('Release ID. Example: 368711502')
    })
    .describe('Input to fetch a single GitHub release by its numeric ID.');

const AuthorSchema = z.object({
    login: z.string().describe('Author login username.'),
    id: z.number().describe('Author user ID.'),
    html_url: z.string().describe('Author profile URL.')
});

const AssetSchema = z.object({
    id: z.number().describe('Asset ID.'),
    name: z.string().describe('Asset filename.'),
    size: z.number().describe('Asset size in bytes.'),
    download_count: z.number().describe('Number of times the asset has been downloaded.'),
    browser_download_url: z.string().describe('Direct download URL for the asset.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Release ID.'),
        tag_name: z.string().describe('Git tag associated with the release.'),
        target_commitish: z.string().describe('Commitish value that determines where the tag is created from.'),
        name: z.string().optional().describe('Release title.'),
        draft: z.boolean().describe('Whether the release is a draft.'),
        prerelease: z.boolean().describe('Whether the release is a prerelease.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        published_at: z.string().optional().describe('Publication timestamp in ISO 8601 format.'),
        body: z.string().optional().describe('Release notes body.'),
        html_url: z.string().describe('Release page URL on GitHub.'),
        tarball_url: z.string().optional().describe('Tarball archive URL for the release.'),
        zipball_url: z.string().optional().describe('Zipball archive URL for the release.'),
        author: AuthorSchema.optional().describe('Author of the release.'),
        assets: z.array(AssetSchema).optional().describe('Assets attached to the release.')
    })
    .describe('Details of a single GitHub release.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single release by ID from the GitHub API.
 * @pitfalls: GitHub identifies releases by a numeric ID, not a tag name; a tag name cannot be used as release_id.
 */
const action = createAction({
    description: 'Get details of a single release.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/releases/releases#get-a-release
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${encodeURIComponent(String(input.release_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Release not found.',
                release_id: input.release_id
            });
        }

        const providerRelease = z
            .object({
                id: z.number(),
                tag_name: z.string(),
                target_commitish: z.string(),
                name: z.string().nullable().optional(),
                draft: z.boolean(),
                prerelease: z.boolean(),
                created_at: z.string(),
                published_at: z.string().nullable().optional(),
                body: z.string().nullable().optional(),
                html_url: z.string(),
                tarball_url: z.string().nullable().optional(),
                zipball_url: z.string().nullable().optional(),
                author: z
                    .object({
                        login: z.string(),
                        id: z.number(),
                        html_url: z.string()
                    })
                    .optional(),
                assets: z
                    .array(
                        z.object({
                            id: z.number(),
                            name: z.string(),
                            size: z.number(),
                            download_count: z.number(),
                            browser_download_url: z.string()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        return {
            id: providerRelease.id,
            tag_name: providerRelease.tag_name,
            target_commitish: providerRelease.target_commitish,
            ...(providerRelease.name != null && { name: providerRelease.name }),
            draft: providerRelease.draft,
            prerelease: providerRelease.prerelease,
            created_at: providerRelease.created_at,
            ...(providerRelease.published_at != null && { published_at: providerRelease.published_at }),
            ...(providerRelease.body != null && { body: providerRelease.body }),
            html_url: providerRelease.html_url,
            ...(providerRelease.tarball_url != null && { tarball_url: providerRelease.tarball_url }),
            ...(providerRelease.zipball_url != null && { zipball_url: providerRelease.zipball_url }),
            ...(providerRelease.author && { author: providerRelease.author }),
            ...(providerRelease.assets && { assets: providerRelease.assets })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
