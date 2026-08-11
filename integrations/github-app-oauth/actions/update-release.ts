import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('Repository name. Example: "nango".'),
        release_id: z.number().describe('Release ID to update. Example: 12345678.'),
        tag_name: z.string().optional().describe('New tag name for the release.'),
        name: z.string().optional().describe('New name or title for the release.'),
        body: z.string().optional().describe('New description body for the release.'),
        draft: z.boolean().optional().describe('Whether the release is a draft.'),
        prerelease: z.boolean().optional().describe('Whether the release is a prerelease.')
    })
    .describe('Input to update an existing GitHub release.');

const ProviderReleaseSchema = z.object({
    id: z.number(),
    tag_name: z.string(),
    name: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    html_url: z.string(),
    url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Release ID.'),
        tag_name: z.string().describe('Tag name associated with the release.'),
        name: z.string().optional().describe('Release title.'),
        body: z.string().optional().describe('Release description.'),
        draft: z.boolean().describe('Whether the release is a draft.'),
        prerelease: z.boolean().describe('Whether the release is a prerelease.'),
        html_url: z.string().describe('URL to the release in the browser.'),
        url: z.string().describe('API URL for the release.')
    })
    .describe('Updated GitHub release metadata.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing release's metadata on GitHub.
 * @pitfalls: Releases and git tags are independent objects; updating a release does not delete or modify its underlying tag.
 */
const action = createAction({
    description: "Update an existing release's metadata.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#update-a-release
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${input.release_id}`,
            data: {
                ...(input.tag_name !== undefined && { tag_name: input.tag_name }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.draft !== undefined && { draft: input.draft }),
                ...(input.prerelease !== undefined && { prerelease: input.prerelease })
            },
            retries: 3
        });

        const providerRelease = ProviderReleaseSchema.parse(response.data);

        return {
            id: providerRelease.id,
            tag_name: providerRelease.tag_name,
            ...(providerRelease.name != null && { name: providerRelease.name }),
            ...(providerRelease.body != null && { body: providerRelease.body }),
            draft: providerRelease.draft,
            prerelease: providerRelease.prerelease,
            html_url: providerRelease.html_url,
            url: providerRelease.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
