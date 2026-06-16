import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_property: z.string().describe('The user property name to delete. Prefix custom user properties with gp:. Example: "gp:my_custom_property"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a user property in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-user-property',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:taxonomy', 'write:taxonomy'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/user-property/${encodeURIComponent(input.user_property)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                response: response.data
            });
        }

        if (!providerResponse.data.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider reported failure deleting the user property.',
                user_property: input.user_property
            });
        }

        return {
            success: providerResponse.data.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
