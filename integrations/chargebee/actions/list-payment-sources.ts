import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('Customer ID. Example: "AzqOd0VMyUhHQZf4"'),
    type: z
        .enum([
            'card',
            'paypal_express_checkout',
            'amazon_payments',
            'direct_debit',
            'generic',
            'alipay',
            'unionpay',
            'apple_pay',
            'wechat_pay',
            'ideal',
            'google_pay',
            'sofort',
            'bancontact',
            'giropay',
            'dotpay',
            'netbanking_emandates',
            'upi',
            'sepa_instant_transfer'
        ])
        .optional()
        .describe('Filter by payment source type.'),
    type_operator: z.enum(['is', 'is_not']).optional().describe('Type filter operator. Default: is.'),
    limit: z.number().optional().describe('Number of records per page. Max: 100.'),
    offset: z.string().optional().describe('Pagination offset cursor from the previous response. Omit for the first page.')
});

const ProviderPaymentSourceSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    reference_id: z.string().optional(),
    gateway: z.string().optional(),
    gateway_account_id: z.string().optional(),
    ip_address: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    resource_version: z.number().optional(),
    deleted: z.boolean().optional(),
    object: z.string().optional(),
    card: z.record(z.string(), z.unknown()).optional(),
    bank_account: z.record(z.string(), z.unknown()).optional(),
    amazon_payment: z.record(z.string(), z.unknown()).optional(),
    paypal: z.record(z.string(), z.unknown()).optional(),
    mandate: z.record(z.string(), z.unknown()).optional()
});

const ProviderListResponseSchema = z.object({
    list: z.array(
        z.object({
            payment_source: ProviderPaymentSourceSchema
        })
    ),
    next_offset: z.string().optional()
});

const PaymentSourceSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    reference_id: z.string().optional(),
    gateway: z.string().optional(),
    gateway_account_id: z.string().optional(),
    ip_address: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    resource_version: z.number().optional(),
    deleted: z.boolean().optional(),
    object: z.string().optional(),
    card: z.record(z.string(), z.unknown()).optional(),
    bank_account: z.record(z.string(), z.unknown()).optional(),
    amazon_payment: z.record(z.string(), z.unknown()).optional(),
    paypal: z.record(z.string(), z.unknown()).optional(),
    mandate: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(PaymentSourceSchema),
    next_offset: z.string().optional().describe('Pagination offset cursor for the next page.')
});

const action = createAction({
    description: 'List payment sources for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    endpoint: {
        method: 'GET',
        path: '/actions/list-payment-sources'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            customer_id: input.customer_id
        };

        if (input.type !== undefined) {
            const operator = input.type_operator === 'is_not' ? 'type[is_not]' : 'type[is]';
            params[operator] = input.type;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        // https://apidocs.chargebee.com/docs/api/payment_sources#list_payment_sources
        const response = await nango.get({
            endpoint: '/api/v2/payment_sources',
            params,
            retries: 3
        });

        const providerData = ProviderListResponseSchema.safeParse(response.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response',
                details: providerData.error.issues
            });
        }

        const items = providerData.data.list.map((item) => item.payment_source);

        return {
            items,
            ...(providerData.data.next_offset !== undefined && { next_offset: providerData.data.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
