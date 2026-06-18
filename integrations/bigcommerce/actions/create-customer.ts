import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email of the customer. Must be unique. Example: "new@example.com"'),
    first_name: z.string().describe('The first name of the customer. Example: "Jane"'),
    last_name: z.string().describe('The last name of the customer. Example: "Doe"'),
    company: z.string().optional().describe('The company of the customer.'),
    phone: z.string().optional().describe('The phone number of the customer.'),
    notes: z.string().optional().describe('The customer notes.'),
    tax_exempt_category: z.string().optional().describe('The tax exempt category code for the customer.'),
    customer_group_id: z.number().optional().describe('ID of the group which this customer belongs to.'),
    authentication: z
        .object({
            new_password: z.string().optional(),
            force_password_reset: z.boolean().optional()
        })
        .optional()
        .describe('Authentication settings for the customer.'),
    accepts_product_review_abandoned_cart_emails: z.boolean().optional().describe('Whether the customer accepts product review and abandoned cart emails.'),
    origin_channel_id: z.number().optional().describe('Channel ID of the customer that has created the form.'),
    channel_ids: z.array(z.number()).optional().describe('Array of channels the customer can access.'),
    addresses: z.array(z.object({}).passthrough()).optional().describe('Array of customer addresses. Limited to 10.'),
    attributes: z.array(z.object({}).passthrough()).optional().describe('Array of customer attributes. Limited to 10.')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    company: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    tax_exempt_category: z.string().nullable().optional(),
    customer_group_id: z.number().nullable().optional(),
    authentication: z.object({}).passthrough().nullable().optional(),
    accepts_product_review_abandoned_cart_emails: z.boolean().nullable().optional(),
    origin_channel_id: z.number().nullable().optional(),
    channel_ids: z.array(z.number()).nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    registration_ip_address: z.string().nullable().optional(),
    addresses: z.array(z.object({}).passthrough()).nullable().optional(),
    attributes: z.array(z.object({}).passthrough()).nullable().optional(),
    form_fields: z.array(z.object({}).passthrough()).nullable().optional(),
    store_credit_amounts: z.array(z.object({}).passthrough()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCustomerSchema),
    meta: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('The unique numeric ID of the customer.'),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    company: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    tax_exempt_category: z.string().optional(),
    customer_group_id: z.number().optional(),
    accepts_product_review_abandoned_cart_emails: z.boolean().optional(),
    origin_channel_id: z.number().optional(),
    channel_ids: z.array(z.number()).optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const action = createAction({
    description: 'Create customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            email: input.email,
            first_name: input.first_name,
            last_name: input.last_name,
            ...(input.company !== undefined && { company: input.company }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.tax_exempt_category !== undefined && { tax_exempt_category: input.tax_exempt_category }),
            ...(input.customer_group_id !== undefined && { customer_group_id: input.customer_group_id }),
            ...(input.authentication !== undefined && { authentication: input.authentication }),
            ...(input.accepts_product_review_abandoned_cart_emails !== undefined && {
                accepts_product_review_abandoned_cart_emails: input.accepts_product_review_abandoned_cart_emails
            }),
            ...(input.origin_channel_id !== undefined && { origin_channel_id: input.origin_channel_id }),
            ...(input.channel_ids !== undefined && { channel_ids: input.channel_ids }),
            ...(input.addresses !== undefined && { addresses: input.addresses }),
            ...(input.attributes !== undefined && { attributes: input.attributes })
        };

        const config: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/customers
            endpoint: '/v3/customers',
            data: [body],
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const customer = parsed.data[0];

        if (!customer) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No customer was returned in the API response.'
            });
        }

        return {
            id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            ...(customer.company != null && { company: customer.company }),
            ...(customer.phone != null && { phone: customer.phone }),
            ...(customer.notes != null && { notes: customer.notes }),
            ...(customer.tax_exempt_category != null && { tax_exempt_category: customer.tax_exempt_category }),
            ...(customer.customer_group_id != null && { customer_group_id: customer.customer_group_id }),
            ...(customer.accepts_product_review_abandoned_cart_emails != null && {
                accepts_product_review_abandoned_cart_emails: customer.accepts_product_review_abandoned_cart_emails
            }),
            ...(customer.origin_channel_id != null && { origin_channel_id: customer.origin_channel_id }),
            ...(customer.channel_ids != null && { channel_ids: customer.channel_ids }),
            ...(customer.date_created != null && { date_created: customer.date_created }),
            ...(customer.date_modified != null && { date_modified: customer.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
