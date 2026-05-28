import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID or URL-encoded path of the project. Example: "82599306"'),
    tag_name: z.string().describe('The Git tag the release is associated with. Example: "v1.0.0"'),
    name: z.string().optional().describe('The release name.'),
    description: z.string().optional().describe('The description of the release. You can use Markdown.'),
    milestones: z.array(z.string()).optional().describe('The title of each milestone to associate with the release. To remove all milestones, specify [].'),
    released_at: z.string().optional().describe('The date when the release is/was ready. Expected in ISO 8601 format (e.g. 2019-03-15T08:00:00Z).')
});

const ProviderReleaseSchema = z
    .object({
        tag_name: z.string(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        created_at: z.string(),
        released_at: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    tag_name: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string(),
    released_at: z.string()
});

const action = createAction({
    description: 'Update a release in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-release',
        group: 'Releases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.gitlab.com/api/releases/#update-a-release
        const response = await nango.put({
            endpoint: `/api/v4/projects/${input.project_id}/releases/${encodeURIComponent(input.tag_name)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.milestones !== undefined && { milestones: input.milestones }),
                ...(input.released_at !== undefined && { released_at: input.released_at })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Release not found or update failed.',
                project_id: input.project_id,
                tag_name: input.tag_name
            });
        }

        const providerRelease = ProviderReleaseSchema.parse(response.data);

        return {
            tag_name: providerRelease.tag_name,
            created_at: providerRelease.created_at,
            released_at: providerRelease.released_at,
            ...(providerRelease.name != null && { name: providerRelease.name }),
            ...(providerRelease.description != null && { description: providerRelease.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
