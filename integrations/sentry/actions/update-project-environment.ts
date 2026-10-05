import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the project belongs to. Example: "my-org".'),
        project_id_or_slug: z
            .string()
            .describe('The ID or slug of the project the environment belongs to. Project slugs are unique within an organization. Example: "my-project".'),
        environment: z.string().describe('The name of the environment to update. Example: "production".'),
        isHidden: z.boolean().describe('Set to true to hide the environment in Sentry, or false to make it visible.')
    })
    .describe('Input for hiding or unhiding a Sentry project environment.');

const OutputSchema = z
    .object({
        id: z.string().describe('The Sentry-assigned ID of the environment, returned as a string. Example: "1".'),
        name: z.string().describe('The name of the environment. Example: "production".'),
        isHidden: z.boolean().optional().describe('Whether the environment is hidden after the update.'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp of when the environment was first seen by Sentry.')
    })
    .describe('The updated Sentry project environment.');

const SentryEnvironmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    isHidden: z.boolean().optional(),
    dateCreated: z.string().optional()
});

/**
 * @tags: [write]
 * @tagReason: Mutates a project environment by setting its isHidden visibility flag; the action performs no provider reads.
 * @pitfalls: Sentry creates environments implicitly when an event or deploy first references a name, so updating a name the project has never used returns a 404 instead of creating the environment.
 */
const action = createAction({
    description: 'Hide or unhide a project environment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:admin', 'project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/environments/update-a-project-environment/
        const response = await nango.put({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/environments/${encodeURIComponent(input.environment)}/`,
            data: {
                isHidden: input.isHidden
            },
            retries: 3
        });

        const environment = SentryEnvironmentSchema.parse(response.data);

        return {
            id: environment.id,
            name: environment.name,
            ...(environment.isHidden !== undefined && { isHidden: environment.isHidden }),
            ...(environment.dateCreated !== undefined && { dateCreated: environment.dateCreated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
