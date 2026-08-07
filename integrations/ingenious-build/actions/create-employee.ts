import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first_name: z.string().min(1).describe('Employee first name. Example: "John"'),
    last_name: z.string().min(1).describe('Employee last name. Example: "Doe"'),
    email: z.string().email().describe('Employee email address. Example: "john.doe@example.com"'),
    account_type_id: z.string().describe('Account type ID from list-account-types. Example: "6a6b8338374668eea203cd45"')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a new employee record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/createemployeepubv2.md
            endpoint: '/api/v2/pub/employees',
            data: {
                first_name: input.first_name,
                last_name: input.last_name,
                email: input.email,
                account_type_id: input.account_type_id
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate employee on a transient failure.
            retries: 1
        });

        if (response.status < 200 || response.status >= 300) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code: ${response.status}`
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
