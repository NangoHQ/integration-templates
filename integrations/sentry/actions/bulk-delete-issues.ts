import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().min(1).describe('The ID or slug of the organization that owns the issues. Example: "nangodev".'),
        ids: z
            .array(
                z
                    .string()
                    .regex(/^[1-9]\d*$/)
                    .describe('Numeric issue ID. Example: "7761433611".')
            )
            .min(1)
            .describe('The list of issue IDs to permanently delete.')
    })
    .describe('Input for permanently deleting a set of issues by their IDs.');

const OutputSchema = z
    .object({
        success: z
            .boolean()
            .describe(
                'True when Sentry accepted the bulk deletion request (HTTP 204). Sentry also returns 204 when some or all IDs matched no issue, so this does not guarantee every listed issue was deleted.'
            )
    })
    .describe('Result of the bulk issue deletion request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes issues in Sentry, an irreversible provider-side mutation.
 * @pitfalls: Sentry still returns success when some or all IDs match no existing issue, so a successful result does not prove every listed issue was deleted. The connection's auth token needs the event:admin scope; tokens without it get a 403 even though other issue operations work.
 */
const action = createAction({
    description: 'Permanently delete a set of issues by their IDs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Sentry expects each issue ID as a repeated `id` query parameter (e.g. `?id=1&id=2`), so the query string is
        // built explicitly: an array passed through a params object can be serialized in a bracketed style Sentry
        // ignores, which would make the endpoint fall back to deleting issues matching the default search query.
        const idParams = input.ids.map((id) => `id=${encodeURIComponent(id)}`).join('&');

        // https://docs.sentry.io/api/events/bulk-remove-an-organizations-issues/
        await nango.delete({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/`,
            params: idParams,
            // Re-sending the same explicit IDs is a no-op (Sentry still returns 204 when no issue matches), so retries are safe here.
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
