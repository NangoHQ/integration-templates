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
 * @pitfalls: Requires the write:all scope, which is absent from Gorgias's standard OAuth scope list; connections without it will receive a permission_error instead of unarchiving the macros.
 */
const action = createAction({
    description: 'Unarchive up to 30 macros in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response. The provider does not return a body for this endpoint.'),

    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/unarchive-macros
        // @allowTryCatch: The Gorgias API requires write:all scope for this endpoint, which is not
        // available on all OAuth connections. We convert the 403 into a structured ActionError so
        // callers can distinguish a missing permission from a successful unarchive.
        try {
            await nango.put({
                endpoint: '/api/macros/unarchive',
                data: {
                    ids: input.ids
                },
                retries: 3
            });
        } catch (err) {
            const axiosResult = z
                .object({ response: z.object({ status: z.number() }).passthrough() })
                .passthrough()
                .safeParse(err);
            if (axiosResult.success && axiosResult.data.response.status === 403) {
                throw new nango.ActionError({
                    type: 'permission_error',
                    message: 'Unable to unarchive macros: the connection is missing the write:all scope required by this endpoint.'
                });
            }
            throw err;
        }
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
