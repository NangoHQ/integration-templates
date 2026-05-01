import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().describe('The URL of the shared link to revoke. Example: "https://www.dropbox.com/s/..."')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the shared link was successfully revoked.')
});

const action = createAction({
    description: 'Revoke a Dropbox shared link so it no longer grants access.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/revoke-shared-link',
        group: 'Sharing'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-revoke_shared_link
        // @allowTryCatch - Need to handle specific Dropbox error types for proper error messaging
        try {
            await nango.post({
                endpoint: '/2/sharing/revoke_shared_link',
                data: {
                    url: input.url
                },
                retries: 10
            });
        } catch (err) {
            if (err && typeof err === 'object' && 'error' in err) {
                const errObj = err.error;
                const errorTag = errObj && typeof errObj === 'object' && '.tag' in errObj ? errObj['.tag'] : undefined;

                if (errorTag === 'shared_link_not_found') {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'The shared link was not found.',
                        url: input.url
                    });
                }

                if (errorTag === 'shared_link_access_denied') {
                    throw new nango.ActionError({
                        type: 'permission_denied',
                        message: 'You do not have permission to revoke this shared link.',
                        url: input.url
                    });
                }

                if (errorTag === 'shared_link_malformed') {
                    throw new nango.ActionError({
                        type: 'invalid_input',
                        message: 'The shared link URL is malformed.',
                        url: input.url
                    });
                }

                if (errorTag === 'unsupported_link_type') {
                    throw new nango.ActionError({
                        type: 'unsupported_operation',
                        message: 'This link type is not supported for revocation.',
                        url: input.url
                    });
                }
            }

            throw err;
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
