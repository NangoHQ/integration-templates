import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const CustomIdInputSchema = z.object({
    namespace: z.string().describe('Metafield namespace. Example: "custom"'),
    key: z.string().describe('Metafield key. Example: "id"'),
    value: z.string().describe('Metafield value. Example: "16a3a6dd"')
});

const InputSchema = z.object({
    email_address: z.string().optional().describe('Customer email address. Example: "bob@example.com"'),
    phone_number: z.string().optional().describe('Customer phone number. Example: "+13125551212"'),
    id: z.string().optional().describe('Shopify customer GID. Example: "gid://shopify/Customer/544365967"'),
    custom_id: CustomIdInputSchema.optional().describe('Custom metafield identifier')
});

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const EmailAddressSchema = z.object({
    emailAddress: z.string().optional().nullable(),
    marketingState: z.string().optional().nullable()
});

const PhoneNumberSchema = z.object({
    phoneNumber: z.string().optional().nullable(),
    marketingState: z.string().optional().nullable()
});

const CustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    displayName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.string()),
    taxExempt: z.boolean(),
    verifiedEmail: z.boolean(),
    numberOfOrders: z.string(),
    state: z.string(),
    note: z.string().optional().nullable(),
    amountSpent: MoneySchema,
    defaultEmailAddress: EmailAddressSchema.optional().nullable(),
    defaultPhoneNumber: PhoneNumberSchema.optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe('Shopify customer GID. Example: "gid://shopify/Customer/544365967"'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string(),
    emailAddress: z.string().optional(),
    emailMarketingState: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneMarketingState: z.string().optional(),
    createdAt: z.string().describe('ISO 8601 timestamp. Example: "2024-01-15T10:30:00Z"'),
    updatedAt: z.string().describe('ISO 8601 timestamp. Example: "2024-01-15T10:30:00Z"'),
    tags: z.array(z.string()),
    taxExempt: z.boolean(),
    verifiedEmail: z.boolean(),
    numberOfOrders: z.string(),
    state: z.string().describe('Customer account state. Example: "ENABLED"'),
    note: z.string().optional(),
    amountSpent: z.object({
        amount: z.string(),
        currencyCode: z.string().describe('Currency code. Example: "USD"')
    })
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z
        .object({
            code: z.string().optional()
        })
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            customerByIdentifier: CustomerSchema.optional().nullable()
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Retrieve a Shopify customer by email, phone, or other supported identifier.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input) => {
        const hasIdentifier = input.email_address || input.phone_number || input.id || input.custom_id;
        if (!hasIdentifier) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one identifier (email_address, phone_number, id, or custom_id) is required.'
            });
        }

        const identifier: {
            emailAddress?: string;
            phoneNumber?: string;
            id?: string;
            customId?: { namespace: string; key: string; value: string };
        } = {};
        if (input.email_address) {
            identifier.emailAddress = input.email_address;
        } else if (input.phone_number) {
            identifier.phoneNumber = input.phone_number;
        } else if (input.id) {
            identifier.id = input.id;
        } else if (input.custom_id) {
            identifier.customId = {
                namespace: input.custom_id.namespace,
                key: input.custom_id.key,
                value: input.custom_id.value
            };
        }

        const query = `
            query($identifier: CustomerIdentifierInput!) {
                customerByIdentifier(identifier: $identifier) {
                    id
                    firstName
                    lastName
                    displayName
                    createdAt
                    updatedAt
                    tags
                    taxExempt
                    verifiedEmail
                    numberOfOrders
                    state
                    note
                    amountSpent {
                        amount
                        currencyCode
                    }
                    defaultEmailAddress {
                        emailAddress
                        marketingState
                    }
                    defaultPhoneNumber {
                        phoneNumber
                        marketingState
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/customerByIdentifier
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    identifier
                }
            },
            retries: 3
        };

        const response = await nango.post(config);
        const parsed = GraphQLResponseSchema.parse(response.data);

        const firstError = parsed.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message,
                code: firstError.extensions?.code
            });
        }

        const customer = parsed.data?.customerByIdentifier;
        if (!customer) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found for the provided identifier.'
            });
        }

        return {
            id: customer.id,
            ...(customer.firstName != null && customer.firstName !== '' && { firstName: customer.firstName }),
            ...(customer.lastName != null && customer.lastName !== '' && { lastName: customer.lastName }),
            displayName: customer.displayName,
            ...(customer.defaultEmailAddress?.emailAddress != null && { emailAddress: customer.defaultEmailAddress.emailAddress }),
            ...(customer.defaultEmailAddress?.marketingState != null && { emailMarketingState: customer.defaultEmailAddress.marketingState }),
            ...(customer.defaultPhoneNumber?.phoneNumber != null && { phoneNumber: customer.defaultPhoneNumber.phoneNumber }),
            ...(customer.defaultPhoneNumber?.marketingState != null && { phoneMarketingState: customer.defaultPhoneNumber.marketingState }),
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            tags: customer.tags,
            taxExempt: customer.taxExempt,
            verifiedEmail: customer.verifiedEmail,
            numberOfOrders: customer.numberOfOrders,
            state: customer.state,
            ...(customer.note != null && customer.note !== '' && { note: customer.note }),
            amountSpent: {
                amount: customer.amountSpent.amount,
                currencyCode: customer.amountSpent.currencyCode
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
