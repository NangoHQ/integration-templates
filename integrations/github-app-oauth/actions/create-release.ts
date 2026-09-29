import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository (user or organization login). Example: "octocat"'),
        repo: z.string().describe('The name of the repository, without the owner. Example: "hello-world"'),
        tag_name: z.string().describe('The name of the tag for this release. Example: "v1.0.0"'),
        target_commitish: z
            .string()
            .optional()
            .describe(
                'The branch or commit SHA to create the tag from when the tag does not already exist. Defaults to the repository default branch. Example: "main"'
            ),
        name: z.string().optional().describe('The name of the release. Example: "v1.0.0"'),
        body: z.string().optional().describe('Text describing the contents of the release'),
        draft: z.boolean().optional().describe('Set to true to create a draft (unpublished) release. Defaults to false'),
        prerelease: z.boolean().optional().describe('Set to true to identify the release as a prerelease. Defaults to false')
    })
    .describe('Input for creating a GitHub release');

const ProviderReleaseSchema = z.object({
    id: z.number(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().nullable(),
    body: z.string().nullable(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    created_at: z.string(),
    published_at: z.string().nullable(),
    url: z.string(),
    html_url: z.string(),
    upload_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the release. Example: 1'),
        tag_name: z.string().describe('The name of the tag this release is associated with. Example: "v1.0.0"'),
        target_commitish: z.string().describe('The commitish value the underlying tag points to, such as a branch name. Example: "main"'),
        name: z.string().optional().describe('The name of the release'),
        body: z.string().optional().describe('Text describing the contents of the release'),
        draft: z.boolean().describe('Whether the release is a draft (unpublished)'),
        prerelease: z.boolean().describe('Whether the release is identified as a prerelease'),
        created_at: z.string().describe('ISO 8601 timestamp of when the release was created. Example: "2013-02-27T19:35:32Z"'),
        published_at: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of when the release was published. Omitted for draft releases. Example: "2013-02-27T19:35:32Z"'),
        url: z.string().describe('The REST API URL of the release. Example: "https://api.github.com/repos/octocat/hello-world/releases/1"'),
        html_url: z.string().describe('The browser URL of the release. Example: "https://github.com/octocat/hello-world/releases/v1.0.0"'),
        upload_url: z.string().describe('The endpoint URL template used to upload assets to the release')
    })
    .describe('The created GitHub release');

/**
 * @tags: [write]
 * @tagReason: Creates a new release (and its underlying git tag when the tag does not already exist) in the repository.
 * @pitfalls: A brand-new tag_name automatically creates the underlying git tag, and that tag is not removed if the release is later deleted. The target_commitish input is ignored when the tag already exists. The installation needs the repository Contents write permission; Releases have no dedicated permission of their own.
 */
const action = createAction({
    description: 'Creates a new release for a repository',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/releases/releases#create-a-release
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases`,
            data: {
                tag_name: input.tag_name,
                ...(input.target_commitish !== undefined && { target_commitish: input.target_commitish }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.draft !== undefined && { draft: input.draft }),
                ...(input.prerelease !== undefined && { prerelease: input.prerelease })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const release = ProviderReleaseSchema.parse(response.data);

        return {
            id: release.id,
            tag_name: release.tag_name,
            target_commitish: release.target_commitish,
            ...(release.name != null && { name: release.name }),
            ...(release.body != null && { body: release.body }),
            draft: release.draft,
            prerelease: release.prerelease,
            created_at: release.created_at,
            ...(release.published_at != null && { published_at: release.published_at }),
            url: release.url,
            html_url: release.html_url,
            upload_url: release.upload_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
