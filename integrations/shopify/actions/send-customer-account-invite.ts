import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The Shopify GID of the customer to invite. Example: "gid://shopify/Customer/105906728"'),
    customMessage: z.string().optional().describe('Optional custom message to include in the invitation email.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    customer: z
        .object({
            id: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            displayName: z.string().optional(),
            state: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
        })
        .optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Send an account invite email to a Shopify customer.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation CustomerSendAccountInviteEmail($customerId: ID!, $email: EmailInput) {
                customerSendAccountInviteEmail(customerId: $customerId, email: $email) {
                    customer {
                        id
                        firstName
                        lastName
                        displayName
                        state
                        createdAt
                        updatedAt
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables: { customerId: string; email?: { customMessage: string } } = {
            customerId: input.customerId
        };

        if (input.customMessage !== undefined) {
            variables.email = { customMessage: input.customMessage };
        }

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/customerSendAccountInviteEmail
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const payload = z
            .object({
                data: z.object({
                    customerSendAccountInviteEmail: z.object({
                        customer: ProviderCustomerSchema.nullable().optional(),
                        userErrors: z.array(
                            z.object({
                                field: z.array(z.string()).optional(),
                                message: z.string()
                            })
                        )
                    })
                })
            })
            .parse(response.data);

        const result = payload.data.customerSendAccountInviteEmail;

        return {
            customer: result.customer
                ? {
                      id: result.customer.id,
                      ...(result.customer.firstName != null && { firstName: result.customer.firstName }),
                      ...(result.customer.lastName != null && { lastName: result.customer.lastName }),
                      ...(result.customer.displayName != null && { displayName: result.customer.displayName }),
                      ...(result.customer.state != null && { state: result.customer.state }),
                      ...(result.customer.createdAt != null && { createdAt: result.customer.createdAt }),
                      ...(result.customer.updatedAt != null && { updatedAt: result.customer.updatedAt })
                  }
                : undefined,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
