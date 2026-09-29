import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository without the .git extension.'),
        release_id: z.number().describe('The unique identifier of the release.')
    })
    .describe('Input parameters for retrieving a single GitHub release.');

const SimpleUserSchema = z.object({
    login: z.string().describe('The GitHub username of the user.'),
    id: z.number().describe('The unique numeric ID of the user.'),
    node_id: z.string().describe('The global node ID of the user.'),
    avatar_url: z.string().describe('The URL of the user avatar image.'),
    gravatar_id: z.string().nullable().describe('The Gravatar ID of the user.'),
    url: z.string().describe('The API URL for the user.'),
    html_url: z.string().describe('The profile URL of the user in the browser.'),
    type: z.string().describe('The type of GitHub account (e.g., User, Bot, Organization).'),
    site_admin: z.boolean().describe('Whether the user is a GitHub site administrator.')
});

const ReleaseAssetSchema = z.object({
    url: z.string().describe('The API URL for the release asset.'),
    browser_download_url: z.string().describe('The URL to download the asset in a browser.'),
    id: z.number().describe('The unique numeric ID of the asset.'),
    node_id: z.string().describe('The global node ID of the asset.'),
    name: z.string().describe('The filename of the asset.'),
    label: z.string().nullable().describe('A display label for the asset.'),
    state: z.string().describe('The state of the asset (e.g., uploaded, open).'),
    content_type: z.string().describe('The MIME type of the asset.'),
    size: z.number().describe('The size of the asset in bytes.'),
    digest: z.string().nullable().describe('The digest hash of the asset.'),
    download_count: z.number().describe('The number of times the asset has been downloaded.'),
    created_at: z.string().describe('The date the asset was created.'),
    updated_at: z.string().describe('The date the asset was last updated.'),
    uploader: z.union([SimpleUserSchema, z.null()]).describe('The user who uploaded the asset, or null if not available.')
});

const ReactionsSchema = z
    .object({
        url: z.string().describe('The API URL for the reactions summary.'),
        total_count: z.number().describe('The total number of reactions.'),
        '+1': z.number().describe('The number of thumbs-up reactions.'),
        '-1': z.number().describe('The number of thumbs-down reactions.'),
        laugh: z.number().describe('The number of laugh reactions.'),
        confused: z.number().describe('The number of confused reactions.'),
        heart: z.number().describe('The number of heart reactions.'),
        hooray: z.number().describe('The number of hooray reactions.'),
        eyes: z.number().describe('The number of eyes reactions.'),
        rocket: z.number().describe('The number of rocket reactions.')
    })
    .optional();

const OutputSchema = z
    .object({
        url: z.string().describe('The URL for the release.'),
        html_url: z.string().describe('The URL for the release in the browser.'),
        assets_url: z.string().describe('The URL for the release assets.'),
        upload_url: z.string().describe('The URL for uploading assets to the release.'),
        tarball_url: z.string().nullable().describe('The URL to download the release as a tarball.'),
        zipball_url: z.string().nullable().describe('The URL to download the release as a zipball.'),
        id: z.number().describe('The unique identifier of the release.'),
        node_id: z.string().describe('The node ID of the release.'),
        tag_name: z.string().describe('The name of the tag associated with the release.'),
        target_commitish: z.string().describe('The commitish value that determines where the Git tag is created from.'),
        name: z.string().nullable().describe('The name of the release.'),
        body: z.string().nullable().describe('Text describing the contents of the tag.'),
        draft: z.boolean().describe('Whether the release is a draft.'),
        prerelease: z.boolean().describe('Whether the release is a prerelease.'),
        immutable: z.boolean().optional().describe('Whether the release is immutable.'),
        created_at: z.string().describe('The date the release was created.'),
        published_at: z.string().nullable().describe('The date the release was published.'),
        updated_at: z.string().nullable().describe('The date the release was last updated.'),
        author: SimpleUserSchema.describe('The author of the release.'),
        assets: z.array(ReleaseAssetSchema).describe('The assets attached to the release.'),
        body_html: z.string().optional().describe('The release body rendered as HTML.'),
        body_text: z.string().optional().describe('The release body rendered as plain text.'),
        mentions_count: z.number().optional().describe('The number of mentions in the release.'),
        discussion_url: z.string().optional().describe('The URL of the discussion associated with the release.'),
        reactions: ReactionsSchema.describe('Reactions to the release.')
    })
    .describe('Details of a single GitHub release.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single public release by its numeric ID from the GitHub API.
 */
const action = createAction({
    description: 'Get details of a single release.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/releases/releases#get-a-release
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

        const release = OutputSchema.parse(response.data);
        return release;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
