import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The ID of the customer that the URL is generated for. Example: "gid://shopify/Customer/105906728"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderPayloadSchema = z.object({
    data: z
        .object({
            customerGenerateAccountActivationUrl: z
                .object({
                    accountActivationUrl: z.string().nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    accountActivationUrl: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Generate an account activation URL for a Shopify customer.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/generate-customer-activation-url',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/customerGenerateAccountActivationUrl
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `mutation customerGenerateAccountActivationUrl($customerId: ID!) {
  customerGenerateAccountActivationUrl(customerId: $customerId) {
    accountActivationUrl
    userErrors {
      field
      message
    }
  }
}`,
                variables: {
                    customerId: input.customerId
                }
            },
            retries: 3
        });

        const providerPayload = ProviderPayloadSchema.parse(response.data);

        if (providerPayload.errors && providerPayload.errors.length > 0) {
            const firstError = z.object({ message: z.string() }).parse(providerPayload.errors[0]);
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message
            });
        }

        const result = providerPayload.data?.customerGenerateAccountActivationUrl;
        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected null response from Shopify'
            });
        }

        return {
            ...(result.accountActivationUrl != null && { accountActivationUrl: result.accountActivationUrl }),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
