import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization that owns the release. Example: "nangodev".'),
        version: z
            .string()
            .describe(
                'The version identifier of the release to delete. This is the release version string, not the numeric release ID. Example: "nango-seed-1.0.0".'
            )
    })
    .describe('Identifies the Sentry release to permanently delete.');

const OutputSchema = z.null().describe('Always null. Sentry permanently deletes the release and responds with 204 No Content.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a release and all of its files in Sentry; nothing is read from the provider.
 * @pitfalls: Deletion is permanent, organization-wide, and removes all of the release's files. The release is identified by its version string, not its numeric ID. The auth token needs the project:releases (or project:admin) scope.
 */
const action = createAction({
    description: 'Delete a release.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:releases'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/delete-an-organizations-release/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/`,
            // Deleting by version is idempotent in effect: a retry after a lost 204 only re-deletes an already-gone release (404, no further side effects).
            retries: 3
        };

        await nango.delete(config);

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
