import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev".'),
        project_id_or_slug: z
            .string()
            .describe('The ID or slug of the project to delete. Project slugs are unique within each organization. Example: "nango-seed-project".')
    })
    .describe('Parameters identifying the organization and project to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the project deletion was successfully scheduled.')
    })
    .describe('Result of the project deletion request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Schedules permanent deletion of a Sentry project, including all of its events and data, through the provider API.
 * @pitfalls: Deletion is scheduled asynchronously and is not immediate, but once it begins the project is hidden from most views. Requires a token with project:admin scope; tokens without it receive a 403 error even if other project operations succeed.
 */
const action = createAction({
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/projects/delete-a-project/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/`,
            retries: 3
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
