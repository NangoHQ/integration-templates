import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ip: z.string().describe('A dedicated IP address. Example: "192.168.1.1"'),
    domain: z.string().describe('The domain name to test. Example: "mail.example.com"')
});

const SuccessResponseSchema = z.object({
    valid: z.union([z.boolean(), z.string()]),
    error: z.string().optional()
});

const ErrorResponseSchema = z.object({
    status: z.literal('error'),
    code: z.number().optional(),
    name: z.string(),
    message: z.string()
});

const ApiResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema]);

const OutputSchema = z.object({
    valid: z.boolean(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Test whether a custom reverse DNS record is correctly configured for a dedicated IP.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ips/check-custom-dns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch The Mandrill API returns HTTP 404 with a JSON error body
        // when the account has no dedicated IPs or the IP address is unknown.
        // This is an expected account-state response, not a broken action.
        try {
            const response = await nango.post({
                // https://mailchimp.com/developer/transactional/api/ips
                endpoint: '1.3/ips/check-custom-dns',
                data: {
                    ip: input.ip,
                    domain: input.domain
                },
                retries: 3
            });

            const raw = ApiResponseSchema.parse(response.data);

            if ('status' in raw) {
                return {
                    valid: false,
                    error: raw.message
                };
            }

            return {
                valid: typeof raw.valid === 'string' ? raw.valid === 'true' : raw.valid,
                ...(raw.error !== undefined && { error: raw.error })
            };
        } catch (error) {
            const errorData =
                error !== null &&
                typeof error === 'object' &&
                'response' in error &&
                error.response !== null &&
                typeof error.response === 'object' &&
                'data' in error.response &&
                error.response.data !== null &&
                typeof error.response.data === 'object'
                    ? error.response.data
                    : null;

            if (errorData !== null && 'status' in errorData && errorData.status === 'error' && 'name' in errorData && errorData.name === 'Unknown_IP') {
                const message =
                    'message' in errorData && typeof errorData.message === 'string'
                        ? errorData.message
                        : 'The requested IP address is not associated with this account.';

                return {
                    valid: false,
                    error: message
                };
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
