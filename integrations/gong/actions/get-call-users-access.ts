import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe('Gong call ID. Example: "123456789"')
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    callAccessList: z
        .array(
            z.object({
                callId: z.string(),
                users: z.array(z.object({ userId: z.string() })).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    callId: z.string(),
    users: z.array(z.object({ userId: z.string() })).optional()
});

const action = createAction({
    description: 'Retrieve the list of users that have individual access to a specific call.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:call-user-access:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch The Gong API returns 400 with "Some calls not found" when the callId does not exist.
        // We catch this to return an empty access list instead of surfacing it as a script error.
        try {
            const response = await nango.post({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/calls/users-access',
                data: {
                    filter: {
                        callIds: [input.callId]
                    }
                },
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);

            const callAccess = providerResponse.callAccessList?.find((item) => item.callId === input.callId);

            return {
                callId: input.callId,
                users: callAccess?.users ?? []
            };
        } catch (error) {
            const parsedErr = AxiosErrorSchema.safeParse(error);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;

            if (status === 400) {
                const data = parsedErr.success ? parsedErr.data.response?.data : undefined;
                const parsed = z.object({ errors: z.array(z.string()).optional() }).safeParse(data);
                if (parsed.success && parsed.data.errors?.some((e) => e.toLowerCase().includes('not found') || e.toLowerCase().includes('some calls'))) {
                    return {
                        callId: input.callId,
                        users: []
                    };
                }
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
