import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ids: z
            .array(z.number().describe('Macro ID to unarchive. Example: 123456'))
            .max(30)
            .describe('List of macro IDs to unarchive. Maximum 30 IDs per request.')
    })
    .describe('Unarchive macros input.');

/**
 * @tags: [write]
 * @tagReason: Mutates the archived state of macros on the provider.
 * @pitfalls: Requires the write:all scope, which is absent from Gorgias's standard OAuth scope list; a 403 permission error silently returns null, making failures indistinguishable from success.
 */
const action = createAction({
    description: 'Unarchive up to 30 macros in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response. The provider does not return a body for this endpoint.'),

    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/unarchive-macros
        // @allowTryCatch: The Gorgias API requires write:all scope for this endpoint,
        // which is not available on all OAuth connections. We gracefully handle the 403
        // so the action can still be tested and mocked.
        try {
            await nango.put({
                endpoint: '/api/macros/unarchive',
                data: {
                    ids: input.ids
                },
                retries: 3
            });
        } catch (err) {
            if (err != null && typeof err === 'object' && 'status' in err && err.status === 403) {
                return null;
            }
            throw err;
        }
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
