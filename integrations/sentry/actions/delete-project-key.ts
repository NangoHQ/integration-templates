import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev"'),
        project_id_or_slug: z.string().describe('The ID or slug of the project the key belongs to. Example: "nango-seed-project"'),
        key_id: z.string().describe('The ID of the client key (DSN) to delete. Example: "4131819035ec5b634cdf5a530ead7f30"')
    })
    .describe('Input for deleting a Sentry project client key (DSN)');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the key was deleted successfully (Sentry returns 204 No Content)')
    })
    .describe('Result of deleting the Sentry project client key');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a project client key (DSN) through the Sentry API.
 * @pitfalls: The token needs the project:admin scope; otherwise the call returns 403 even if other project-key operations succeed, and the access arrays in Sentry org/project responses do not reliably predict what the token may do. Deleting a key is permanent and disables that DSN for event ingestion.
 */
const action = createAction({
    description: 'Delete a project key (DSN).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/projects/delete-a-client-key/
        await nango.delete({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/keys/${encodeURIComponent(input.key_id)}/`,
            // Deleting a specific key is idempotent in effect: a repeated call after a lost response just 404s, so limited retries are safe.
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
