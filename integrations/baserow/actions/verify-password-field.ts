import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    field_id: z.number().describe('The ID of the password field to verify against. Example: 9574050'),
    row_id: z.number().describe('The ID of the row containing the password. Example: 1'),
    password: z.string().describe('The plaintext password to verify. Example: "NangoTest123!"')
});

const OutputSchema = z.object({
    is_correct: z.boolean()
});

const ProviderSuccessSchema = z.object({
    is_correct: z.boolean()
});

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const action = createAction({
    description: 'Verify a password value against a Password-type field on a row.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Baserow returns HTTP 401 for an incorrect password.
        // We treat that as a normal negative result rather than a thrown error.
        try {
            const response = await nango.post({
                // https://api.baserow.io/api/redoc/ (POST /database/fields/password-authentication/)
                endpoint: '/database/fields/password-authentication/',
                data: {
                    field_id: input.field_id,
                    row_id: input.row_id,
                    password: input.password
                },
                retries: 3
            });

            const providerData = ProviderSuccessSchema.parse(response.data);

            return {
                is_correct: providerData.is_correct
            };
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);

            if (parsedError.success && parsedError.data.response.status === 401) {
                return {
                    is_correct: false
                };
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
