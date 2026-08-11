import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        tag_name: z.string().describe('The name of the tag for the release. Example: "v1.0.0"'),
        target_commitish: z
            .string()
            .optional()
            .describe(
                'The commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Defaults to the repository\'s default branch if omitted. Example: "master"'
            ),
        name: z.string().optional().describe('The name of the release. Example: "v1.0.0"'),
        body: z.string().optional().describe('Text describing the contents of the tag. Example: "Description of the release"'),
        draft: z.boolean().optional().describe('Whether the release is a draft. Defaults to false.'),
        prerelease: z.boolean().optional().describe('Whether the release is a prerelease. Defaults to false.')
    })
    .describe('Input to create a GitHub release.');

const AuthorSchema = z
    .object({
        login: z.string().describe('The username of the release author.'),
        id: z.number().describe('The unique identifier of the release author.'),
        avatar_url: z.string().describe("The URL of the release author's avatar."),
        html_url: z.string().describe("The URL of the release author's profile.")
    })
    .describe('The user who created the release.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the release.'),
        tag_name: z.string().describe('The name of the tag for the release.'),
        target_commitish: z.string().describe('The commitish value the Git tag was created from.'),
        name: z.string().optional().describe('The name of the release.'),
        body: z.string().optional().describe('The description of the release.'),
        draft: z.boolean().describe('Whether the release is a draft.'),
        prerelease: z.boolean().describe('Whether the release is a prerelease.'),
        html_url: z.string().describe('The URL of the release in the browser.'),
        url: z.string().describe('The API URL of the release.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the release was created.'),
        published_at: z.string().optional().describe('The ISO 8601 timestamp when the release was published. Omitted for drafts.'),
        author: AuthorSchema.describe('The user who created the release.')
    })
    .describe('A GitHub release that was created.');

/**
 * @tags: [write]
 * @tagReason: Creates a new release and its underlying git tag on the provider.
 * @pitfalls: Creating a release with a new tag_name automatically creates the underlying git tag, but deleting the release later does not delete that tag, so reusing the same tag_name afterward will fail with already_exists until the tag is removed separately.
 */
const action = createAction({
    description: 'Create a new release (and its underlying git tag, if the tag does not already exist).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/releases/releases#create-a-release
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases`,
            data: {
                tag_name: input.tag_name,
                ...(input.target_commitish !== undefined && { target_commitish: input.target_commitish }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.draft !== undefined && { draft: input.draft }),
                ...(input.prerelease !== undefined && { prerelease: input.prerelease })
            },
            retries: 3
        });

        const raw = response.data;

        const parsed = z
            .object({
                id: z.number(),
                tag_name: z.string(),
                target_commitish: z.string(),
                name: z.string().nullable(),
                body: z.string().nullable(),
                draft: z.boolean(),
                prerelease: z.boolean(),
                html_url: z.string(),
                url: z.string(),
                created_at: z.string(),
                published_at: z.string().nullable(),
                author: z.object({
                    login: z.string(),
                    id: z.number(),
                    avatar_url: z.string(),
                    html_url: z.string()
                })
            })
            .parse(raw);

        return {
            id: parsed.id,
            tag_name: parsed.tag_name,
            target_commitish: parsed.target_commitish,
            ...(parsed.name != null && { name: parsed.name }),
            ...(parsed.body != null && { body: parsed.body }),
            draft: parsed.draft,
            prerelease: parsed.prerelease,
            html_url: parsed.html_url,
            url: parsed.url,
            created_at: parsed.created_at,
            ...(parsed.published_at != null && { published_at: parsed.published_at }),
            author: {
                login: parsed.author.login,
                id: parsed.author.id,
                avatar_url: parsed.author.avatar_url,
                html_url: parsed.author.html_url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
