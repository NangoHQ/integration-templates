import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(50).describe('Spotify artist IDs to follow. Between 1 and 50 IDs. Example: ["4Z8W4fKeB5YxbusRsdQVPb"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

function getStatusFromError(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null) {
        const status = Reflect.get(error, 'status');
        if (typeof status === 'number') {
            return status;
        }
        // Check nested payload (Nango wraps some errors as error.payload.error.status)
        const payload = Reflect.get(error, 'payload');
        if (typeof payload === 'object' && payload !== null) {
            const payloadError = Reflect.get(payload, 'error');
            if (typeof payloadError === 'object' && payloadError !== null) {
                const payloadStatus = Reflect.get(payloadError, 'status');
                if (typeof payloadStatus === 'number') {
                    return payloadStatus;
                }
            }
        }
    }
    return undefined;
}

const action = createAction({
    description: 'Follow one or more artists on behalf of the current user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-follow-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/follow-artists-users
        // @allowTryCatch Spotify may return 403 for follow endpoints when the app is in Extended Quota Mode
        try {
            const response = await nango.put({
                endpoint: '/v1/me/following',
                params: {
                    type: 'artist',
                    ids: input.ids.join(',')
                },
                retries: 3
            });

            if (response.status === 403) {
                return {
                    success: false
                };
            }
        } catch (error) {
            const status = getStatusFromError(error);
            if (status === 403) {
                return {
                    success: false
                };
            }
            throw error;
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
