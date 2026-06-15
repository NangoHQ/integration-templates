import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe('Gong\'s unique numeric call ID. Example: "7782342274025937895"'),
    userIds: z.array(z.string()).describe("Array of Gong's unique numeric user IDs to remove access for.")
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference ID, generated for this request.')
});

const action = createAction({
    description: 'Remove individual user access from specific calls',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-call-users-access',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:call-user-access:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: The Gong API returns 400 when a call does not exist, which we map to a typed ActionError.
        try {
            const response = await nango.delete({
                // https://help.gong.io/apidocs/remove-specific-individual-users-access-from-calls-v2callsusers-access
                endpoint: '/v2/calls/users-access',
                data: {
                    callAccessList: [
                        {
                            callId: input.callId,
                            userIds: input.userIds
                        }
                    ]
                },
                retries: 3
            });

            const providerResponse = z
                .object({
                    requestId: z.string()
                })
                .parse(response.data);

            return {
                requestId: providerResponse.requestId
            };
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                typeof error.response.status === 'number' &&
                error.response.status === 400 &&
                'data' in error.response &&
                typeof error.response.data === 'object' &&
                error.response.data !== null &&
                'errors' in error.response.data &&
                Array.isArray(error.response.data.errors) &&
                error.response.data.errors.includes('Some calls not found')
            ) {
                const data = error.response.data;
                let requestId: string | undefined;
                if ('requestId' in data && typeof data.requestId === 'string') {
                    requestId = data.requestId;
                }

                throw new nango.ActionError({
                    type: 'call_not_found',
                    message: 'One or more calls were not found.',
                    callId: input.callId,
                    requestId: requestId
                });
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
