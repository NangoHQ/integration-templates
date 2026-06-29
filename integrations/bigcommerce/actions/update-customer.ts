import { z } from 'zod';
import { createAction } from 'nango';

const CustomerAuthenticationSchema = z
    .object({
        force_password_reset: z.boolean().optional(),
        new_password: z.string().optional()
    })
    .optional();

const StoreCreditAmountSchema = z
    .object({
        amount: z.number().optional()
    })
    .optional();

const FormFieldSchema = z
    .object({
        name: z.string().optional(),
        value: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    id: z.number().describe('The unique numeric ID of the customer. Example: 1'),
    email: z.string().optional().describe('Email of the customer. Must be unique.'),
    first_name: z.string().optional().describe('First name of the customer.'),
    last_name: z.string().optional().describe('Last name of the customer.'),
    company: z.string().optional().describe('Company of the customer.'),
    phone: z.string().optional().describe('Phone number of the customer.'),
    notes: z.string().optional().describe('Notes for the customer.'),
    tax_exempt_category: z.string().optional().describe('Tax-exempt category for the customer.'),
    customer_group_id: z.number().optional().describe('Customer group ID for the customer.'),
    accepts_product_review_abandoned_cart_emails: z.boolean().optional().describe('Whether the customer accepts product review and abandoned cart emails.'),
    store_credit_amounts: z.array(StoreCreditAmountSchema).optional().describe('Store credit amounts for the customer.'),
    channel_ids: z.array(z.number()).optional().describe('Array of channel IDs the customer can access.'),
    form_fields: z.array(FormFieldSchema).optional().describe('Custom form fields for the customer.'),
    authentication: CustomerAuthenticationSchema.describe('Authentication settings for the customer.')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    email: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    company: z.string().nullish(),
    phone: z.string().nullish(),
    notes: z.string().nullish(),
    tax_exempt_category: z.string().nullish(),
    customer_group_id: z.number().nullish(),
    accepts_product_review_abandoned_cart_emails: z.boolean().nullish(),
    store_credit_amounts: z.array(z.object({ amount: z.number().optional() }).optional()).nullish(),
    origin_channel_id: z.number().nullish(),
    channel_ids: z.array(z.number()).nullish(),
    form_fields: z.array(z.object({ name: z.string().optional(), value: z.string().optional() }).optional()).nullish(),
    authentication: z.object({ force_password_reset: z.boolean().optional(), new_password: z.string().optional() }).nullish(),
    registration_ip_address: z.string().nullish(),
    date_created: z.string().nullish(),
    date_modified: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.number().describe('The unique numeric ID of the customer.'),
    email: z.string().optional().describe('Email of the customer.'),
    first_name: z.string().optional().describe('First name of the customer.'),
    last_name: z.string().optional().describe('Last name of the customer.'),
    company: z.string().optional().describe('Company of the customer.'),
    phone: z.string().optional().describe('Phone number of the customer.'),
    notes: z.string().optional().describe('Notes for the customer.'),
    tax_exempt_category: z.string().optional().describe('Tax-exempt category for the customer.'),
    customer_group_id: z.number().optional().describe('Customer group ID for the customer.'),
    accepts_product_review_abandoned_cart_emails: z.boolean().optional().describe('Whether the customer accepts product review and abandoned cart emails.'),
    store_credit_amounts: z
        .array(z.object({ amount: z.number().optional() }).optional())
        .optional()
        .describe('Store credit amounts for the customer.'),
    origin_channel_id: z.number().optional().describe('Channel ID of the customer.'),
    channel_ids: z.array(z.number()).optional().describe('Array of channel IDs the customer can access.'),
    form_fields: z
        .array(z.object({ name: z.string().optional(), value: z.string().optional() }).optional())
        .optional()
        .describe('Custom form fields for the customer.'),
    authentication: z
        .object({ force_password_reset: z.boolean().optional(), new_password: z.string().optional() })
        .optional()
        .describe('Authentication settings for the customer.'),
    registration_ip_address: z.string().optional().describe('The IP address from which this customer was registered.'),
    date_created: z.string().optional().describe('The date the customer was created.'),
    date_modified: z.string().optional().describe('The date the customer was last modified.')
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {
            id: input.id
        };

        if (input.email !== undefined) {
            updateBody['email'] = input.email;
        }
        if (input.first_name !== undefined) {
            updateBody['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            updateBody['last_name'] = input.last_name;
        }
        if (input.company !== undefined) {
            updateBody['company'] = input.company;
        }
        if (input.phone !== undefined) {
            updateBody['phone'] = input.phone;
        }
        if (input.notes !== undefined) {
            updateBody['notes'] = input.notes;
        }
        if (input.tax_exempt_category !== undefined) {
            updateBody['tax_exempt_category'] = input.tax_exempt_category;
        }
        if (input.customer_group_id !== undefined) {
            updateBody['customer_group_id'] = input.customer_group_id;
        }
        if (input.accepts_product_review_abandoned_cart_emails !== undefined) {
            updateBody['accepts_product_review_abandoned_cart_emails'] = input.accepts_product_review_abandoned_cart_emails;
        }
        if (input.store_credit_amounts !== undefined) {
            updateBody['store_credit_amounts'] = input.store_credit_amounts;
        }
        if (input.channel_ids !== undefined) {
            updateBody['channel_ids'] = input.channel_ids;
        }
        if (input.form_fields !== undefined) {
            updateBody['form_fields'] = input.form_fields;
        }
        if (input.authentication !== undefined) {
            updateBody['authentication'] = input.authentication;
        }

        // https://developer.bigcommerce.com/docs/rest-management/customers
        const response = await nango.put({
            endpoint: '/v3/customers',
            data: [updateBody],
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object' || !Array.isArray(responseData.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from BigCommerce API.',
                response: responseData
            });
        }

        const customers = responseData.data;
        if (customers.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No customer was returned after update.',
                customer_id: input.id
            });
        }

        const providerCustomer = ProviderCustomerSchema.parse(customers[0]);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.first_name != null && { first_name: providerCustomer.first_name }),
            ...(providerCustomer.last_name != null && { last_name: providerCustomer.last_name }),
            ...(providerCustomer.company != null && { company: providerCustomer.company }),
            ...(providerCustomer.phone != null && { phone: providerCustomer.phone }),
            ...(providerCustomer.notes != null && { notes: providerCustomer.notes }),
            ...(providerCustomer.tax_exempt_category != null && { tax_exempt_category: providerCustomer.tax_exempt_category }),
            ...(providerCustomer.customer_group_id != null && { customer_group_id: providerCustomer.customer_group_id }),
            ...(providerCustomer.accepts_product_review_abandoned_cart_emails != null && {
                accepts_product_review_abandoned_cart_emails: providerCustomer.accepts_product_review_abandoned_cart_emails
            }),
            ...(providerCustomer.store_credit_amounts != null && { store_credit_amounts: providerCustomer.store_credit_amounts }),
            ...(providerCustomer.origin_channel_id != null && { origin_channel_id: providerCustomer.origin_channel_id }),
            ...(providerCustomer.channel_ids != null && { channel_ids: providerCustomer.channel_ids }),
            ...(providerCustomer.form_fields != null && { form_fields: providerCustomer.form_fields }),
            ...(providerCustomer.authentication != null && { authentication: providerCustomer.authentication }),
            ...(providerCustomer.registration_ip_address != null && { registration_ip_address: providerCustomer.registration_ip_address }),
            ...(providerCustomer.date_created != null && { date_created: providerCustomer.date_created }),
            ...(providerCustomer.date_modified != null && { date_modified: providerCustomer.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
