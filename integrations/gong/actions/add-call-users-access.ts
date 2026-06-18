import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe("Gong's unique numeric call ID. Example: '7782342274025937895'"),
    userIds: z.array(z.string()).describe("Array of Gong's unique numeric user IDs. Example: ['234599484848423']")
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional()
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional()
});

const action = createAction({
    description: 'Grant individual users access to specific calls.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:call-user-access:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The API returns 400 with "Some calls not found" when the callId does not exist.
        // We catch this specific case to return a controlled empty response.
        try {
            response = await nango.put({
                // https://help.gong.io/apidocs/give-individual-users-access-to-calls-v2callsusers-access
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
        } catch (err) {
            const parsedErr = AxiosErrorSchema.safeParse(err);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;

            if (status === 400) {
                const data = parsedErr.success ? parsedErr.data.response?.data : undefined;
                const parsed = z.object({ errors: z.array(z.string()).optional() }).safeParse(data);
                if (parsed.success && parsed.data.errors?.some((e) => e.toLowerCase().includes('not found') || e.toLowerCase().includes('invalid'))) {
                    return {};
                }
            }
            throw err;
        }

        if (response.status !== undefined && response.status >= 400) {
            return {};
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
