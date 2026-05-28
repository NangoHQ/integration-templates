import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID or URL-encoded path of the project. Example: "82599306"'),
    tag_name: z.string().describe('The Git tag the release is associated with. Example: "v1.0.0"')
});

const ProviderReleaseSchema = z.object({
    tag_name: z.string(),
    name: z.string().nullable().optional(),
    created_at: z.string().optional(),
    released_at: z.string().optional()
});

const OutputSchema = z.object({
    tag_name: z.string(),
    name: z.string().optional(),
    deleted: z.literal(true)
});

const action = createAction({
    description: 'Delete a release in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-release',
        group: 'Releases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.gitlab.com/api/releases/#delete-a-release
            endpoint: `/api/v4/projects/${input.project_id}/releases/${encodeURIComponent(input.tag_name)}`,
            retries: 2
        };

        const response = await nango.delete(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Release not found or could not be deleted',
                project_id: input.project_id,
                tag_name: input.tag_name
            });
        }

        const providerRelease = ProviderReleaseSchema.parse(response.data);

        return {
            tag_name: providerRelease.tag_name,
            ...(providerRelease.name != null && { name: providerRelease.name }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
