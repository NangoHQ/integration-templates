import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBillingSchema = z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable()
});

const ProviderShippingSchema = z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country: z.string().optional().nullable()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    parent_id: z.number().optional().nullable(),
    number: z.string().optional().nullable(),
    order_key: z.string().optional().nullable(),
    created_via: z.string().optional().nullable(),
    version: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    currency: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_created_gmt: z.string().optional().nullable(),
    date_modified: z.string().optional().nullable(),
    date_modified_gmt: z.string().optional().nullable(),
    discount_total: z.string().optional().nullable(),
    discount_tax: z.string().optional().nullable(),
    shipping_total: z.string().optional().nullable(),
    shipping_tax: z.string().optional().nullable(),
    cart_tax: z.string().optional().nullable(),
    total: z.string().optional().nullable(),
    total_tax: z.string().optional().nullable(),
    prices_include_tax: z.boolean().optional().nullable(),
    customer_id: z.number().optional().nullable(),
    customer_ip_address: z.string().optional().nullable(),
    customer_user_agent: z.string().optional().nullable(),
    customer_note: z.string().optional().nullable(),
    billing: ProviderBillingSchema.optional().nullable(),
    shipping: ProviderShippingSchema.optional().nullable(),
    payment_method: z.string().optional().nullable(),
    payment_method_title: z.string().optional().nullable(),
    transaction_id: z.string().optional().nullable(),
    date_paid: z.string().optional().nullable(),
    date_paid_gmt: z.string().optional().nullable(),
    date_completed: z.string().optional().nullable(),
    date_completed_gmt: z.string().optional().nullable(),
    cart_hash: z.string().optional().nullable(),
    meta_data: z.array(z.unknown()).optional(),
    line_items: z.array(z.unknown()).optional(),
    tax_lines: z.array(z.unknown()).optional(),
    shipping_lines: z.array(z.unknown()).optional(),
    fee_lines: z.array(z.unknown()).optional(),
    coupon_lines: z.array(z.unknown()).optional(),
    refunds: z.array(z.unknown()).optional()
});

const OrderSchema = z.object({
    id: z.string(),
    parent_id: z.string().optional(),
    number: z.string().optional(),
    order_key: z.string().optional(),
    created_via: z.string().optional(),
    version: z.string().optional(),
    status: z.string().optional(),
    currency: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    discount_total: z.string().optional(),
    discount_tax: z.string().optional(),
    shipping_total: z.string().optional(),
    shipping_tax: z.string().optional(),
    cart_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    prices_include_tax: z.boolean().optional(),
    customer_id: z.string().optional(),
    customer_ip_address: z.string().optional(),
    customer_user_agent: z.string().optional(),
    customer_note: z.string().optional(),
    billing: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    shipping: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    payment_method: z.string().optional(),
    payment_method_title: z.string().optional(),
    transaction_id: z.string().optional(),
    date_paid: z.string().optional(),
    date_paid_gmt: z.string().optional(),
    date_completed: z.string().optional(),
    date_completed_gmt: z.string().optional(),
    cart_hash: z.string().optional(),
    meta_data: z.array(z.unknown()).optional(),
    line_items: z.array(z.unknown()).optional(),
    tax_lines: z.array(z.unknown()).optional(),
    shipping_lines: z.array(z.unknown()).optional(),
    fee_lines: z.array(z.unknown()).optional(),
    coupon_lines: z.array(z.unknown()).optional(),
    refunds: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number()
});

const sync = createSync({
    description: 'Sync orders from WooCommerce.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/orders' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = typeof checkpoint?.['updated_after'] === 'string' ? checkpoint['updated_after'] : undefined;
        let nextPage: number | undefined = typeof checkpoint?.['page'] === 'number' ? checkpoint['page'] : 1;
        let lastProcessedUpdatedAt: string | undefined;

        const params: Record<string, string> = {
            orderby: 'modified',
            order: 'asc'
        };
        if (updatedAfter) {
            params['modified_after'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
            endpoint: '/wp-json/wc/v3/orders',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 2,
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam + 1 : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const orders = [];
            for (const rawRecord of pageResults) {
                const parsed = ProviderOrderSchema.safeParse(rawRecord);
                if (!parsed.success) {
                    throw new Error(`Failed to parse order: ${parsed.error.message}`);
                }

                const raw = parsed.data;
                const order = {
                    id: String(raw.id),
                    ...(raw.parent_id != null && {
                        parent_id: String(raw.parent_id)
                    }),
                    ...(raw.number != null && { number: raw.number }),
                    ...(raw.order_key != null && { order_key: raw.order_key }),
                    ...(raw.created_via != null && {
                        created_via: raw.created_via
                    }),
                    ...(raw.version != null && { version: raw.version }),
                    ...(raw.status != null && { status: raw.status }),
                    ...(raw.currency != null && { currency: raw.currency }),
                    ...(raw.date_created != null && {
                        date_created: raw.date_created
                    }),
                    ...(raw.date_created_gmt != null && {
                        date_created_gmt: raw.date_created_gmt
                    }),
                    ...(raw.date_modified != null && {
                        date_modified: raw.date_modified
                    }),
                    ...(raw.date_modified_gmt != null && {
                        date_modified_gmt: raw.date_modified_gmt
                    }),
                    ...(raw.discount_total != null && {
                        discount_total: raw.discount_total
                    }),
                    ...(raw.discount_tax != null && {
                        discount_tax: raw.discount_tax
                    }),
                    ...(raw.shipping_total != null && {
                        shipping_total: raw.shipping_total
                    }),
                    ...(raw.shipping_tax != null && {
                        shipping_tax: raw.shipping_tax
                    }),
                    ...(raw.cart_tax != null && { cart_tax: raw.cart_tax }),
                    ...(raw.total != null && { total: raw.total }),
                    ...(raw.total_tax != null && { total_tax: raw.total_tax }),
                    ...(raw.prices_include_tax != null && {
                        prices_include_tax: raw.prices_include_tax
                    }),
                    ...(raw.customer_id != null && {
                        customer_id: String(raw.customer_id)
                    }),
                    ...(raw.customer_ip_address != null && {
                        customer_ip_address: raw.customer_ip_address
                    }),
                    ...(raw.customer_user_agent != null && {
                        customer_user_agent: raw.customer_user_agent
                    }),
                    ...(raw.customer_note != null && {
                        customer_note: raw.customer_note
                    }),
                    ...(raw.billing != null && {
                        billing: {
                            ...(raw.billing.first_name != null && {
                                first_name: raw.billing.first_name
                            }),
                            ...(raw.billing.last_name != null && {
                                last_name: raw.billing.last_name
                            }),
                            ...(raw.billing.company != null && {
                                company: raw.billing.company
                            }),
                            ...(raw.billing.address_1 != null && {
                                address_1: raw.billing.address_1
                            }),
                            ...(raw.billing.address_2 != null && {
                                address_2: raw.billing.address_2
                            }),
                            ...(raw.billing.city != null && {
                                city: raw.billing.city
                            }),
                            ...(raw.billing.state != null && {
                                state: raw.billing.state
                            }),
                            ...(raw.billing.postcode != null && {
                                postcode: raw.billing.postcode
                            }),
                            ...(raw.billing.country != null && {
                                country: raw.billing.country
                            }),
                            ...(raw.billing.email != null && {
                                email: raw.billing.email
                            }),
                            ...(raw.billing.phone != null && {
                                phone: raw.billing.phone
                            })
                        }
                    }),
                    ...(raw.shipping != null && {
                        shipping: {
                            ...(raw.shipping.first_name != null && {
                                first_name: raw.shipping.first_name
                            }),
                            ...(raw.shipping.last_name != null && {
                                last_name: raw.shipping.last_name
                            }),
                            ...(raw.shipping.company != null && {
                                company: raw.shipping.company
                            }),
                            ...(raw.shipping.address_1 != null && {
                                address_1: raw.shipping.address_1
                            }),
                            ...(raw.shipping.address_2 != null && {
                                address_2: raw.shipping.address_2
                            }),
                            ...(raw.shipping.city != null && {
                                city: raw.shipping.city
                            }),
                            ...(raw.shipping.state != null && {
                                state: raw.shipping.state
                            }),
                            ...(raw.shipping.postcode != null && {
                                postcode: raw.shipping.postcode
                            }),
                            ...(raw.shipping.country != null && {
                                country: raw.shipping.country
                            })
                        }
                    }),
                    ...(raw.payment_method != null && {
                        payment_method: raw.payment_method
                    }),
                    ...(raw.payment_method_title != null && {
                        payment_method_title: raw.payment_method_title
                    }),
                    ...(raw.transaction_id != null && {
                        transaction_id: raw.transaction_id
                    }),
                    ...(raw.date_paid != null && { date_paid: raw.date_paid }),
                    ...(raw.date_paid_gmt != null && {
                        date_paid_gmt: raw.date_paid_gmt
                    }),
                    ...(raw.date_completed != null && {
                        date_completed: raw.date_completed
                    }),
                    ...(raw.date_completed_gmt != null && {
                        date_completed_gmt: raw.date_completed_gmt
                    }),
                    ...(raw.cart_hash != null && { cart_hash: raw.cart_hash }),
                    ...(raw.meta_data !== undefined && {
                        meta_data: raw.meta_data
                    }),
                    ...(raw.line_items !== undefined && {
                        line_items: raw.line_items
                    }),
                    ...(raw.tax_lines !== undefined && {
                        tax_lines: raw.tax_lines
                    }),
                    ...(raw.shipping_lines !== undefined && {
                        shipping_lines: raw.shipping_lines
                    }),
                    ...(raw.fee_lines !== undefined && {
                        fee_lines: raw.fee_lines
                    }),
                    ...(raw.coupon_lines !== undefined && {
                        coupon_lines: raw.coupon_lines
                    }),
                    ...(raw.refunds !== undefined && {
                        refunds: raw.refunds
                    })
                };
                orders.push(order);
            }

            if (orders.length === 0) {
                continue;
            }

            await nango.batchSave(orders, 'Order');
            const lastOrder = orders[orders.length - 1];
            if (lastOrder) {
                lastProcessedUpdatedAt = lastOrder.date_modified;
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page: nextPage
                });
            }
        }

        if (lastProcessedUpdatedAt) {
            await nango.saveCheckpoint({
                updated_after: lastProcessedUpdatedAt,
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
