import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango".'),
        release_id: z.number().int().describe('The unique identifier of the release to update. Example: 398418000.'),
        tag_name: z.string().optional().describe('The name of the tag associated with the release. Example: "v1.0.0".'),
        name: z.string().optional().describe('The name of the release.'),
        body: z.string().optional().describe('Text describing the contents of the release.'),
        draft: z.boolean().optional().describe('Set to true to make the release a draft, or false to publish it.'),
        prerelease: z.boolean().optional().describe('Set to true to identify the release as a prerelease, or false for a full release.')
    })
    .describe('Identifies the release to update and the metadata fields to change. Only the provided fields are sent to GitHub.');

const ReleaseSchema = z.object({
    id: z.number(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().nullable(),
    body: z.string().nullable(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    html_url: z.string(),
    created_at: z.string(),
    published_at: z.string().nullable(),
    updated_at: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the release.'),
        tag_name: z.string().describe('The name of the tag associated with the release.'),
        target_commitish: z.string().describe('The commitish value that determines where the Git tag is created from.'),
        name: z.string().optional().describe('The name of the release. Omitted when the release has no name.'),
        body: z.string().optional().describe('Text describing the contents of the release. Omitted when empty.'),
        draft: z.boolean().describe('Whether the release is a draft (unpublished).'),
        prerelease: z.boolean().describe('Whether the release is identified as a prerelease.'),
        html_url: z.string().describe('The browser URL of the release.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the release was created. Example: "2026-09-28T16:14:17Z".'),
        published_at: z.string().optional().describe('ISO 8601 timestamp of when the release was published. Omitted for draft releases.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the release was last updated.')
    })
    .describe('The updated release.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing release's metadata on GitHub via a PATCH request.
 * @pitfalls: Requires write access to the repository (for GitHub App installations, the Contents read-and-write permission); if the release's tag resolves to a commit that adds or modifies files under .github/workflows/, the token must also be authorized to modify workflows or the update fails with a 404 or 403 error.
 */
const action = createAction({
    description: "Update an existing release's metadata.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#update-a-release
        const response = await nango.patch({
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

        const release = ReleaseSchema.parse(response.data);

        return {
            id: release.id,
            tag_name: release.tag_name,
            target_commitish: release.target_commitish,
            ...(release.name != null && { name: release.name }),
            ...(release.body != null && { body: release.body }),
            draft: release.draft,
            prerelease: release.prerelease,
            html_url: release.html_url,
            created_at: release.created_at,
            ...(release.published_at != null && { published_at: release.published_at }),
            ...(release.updated_at != null && { updated_at: release.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
