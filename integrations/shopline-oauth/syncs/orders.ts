import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderLineItemSchema = z
    .object({
        id: z.string(),
        product_id: z.string().optional().nullable(),
        variant_id: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        quantity: z.number().optional().nullable(),
        price: z.string().optional().nullable(),
        sku: z.string().optional().nullable(),
        variant_title: z.string().optional().nullable(),
        vendor: z.string().optional().nullable(),
        fulfillment_service: z.string().optional().nullable(),
        grams: z.number().optional().nullable()
    })
    .passthrough();

const ProviderFulfillmentSchema = z
    .object({
        id: z.string(),
        order_id: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        tracking_number: z.string().optional().nullable(),
        tracking_company: z.string().optional().nullable()
    })
    .passthrough();

const ProviderRefundLineItemSchema = z
    .object({
        id: z.string().optional().nullable(),
        line_item_id: z.string().optional().nullable(),
        quantity: z.number().optional().nullable()
    })
    .passthrough();

const ProviderRefundTransactionSchema = z
    .object({
        id: z.string().optional().nullable(),
        amount: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        kind: z.string().optional().nullable()
    })
    .passthrough();

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional().nullable(),
        note: z.string().optional().nullable(),
        refund_line_items: z.array(ProviderRefundLineItemSchema).optional().nullable(),
        transactions: z.array(ProviderRefundTransactionSchema).optional().nullable()
    })
    .passthrough();

const ProviderPaymentDetailSchema = z
    .object({
        id: z.string().optional().nullable(),
        amount: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        kind: z.string().optional().nullable(),
        gateway: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        processed_at: z.string().optional().nullable(),
        currency: z.string().optional().nullable()
    })
    .passthrough();

const ProviderAddressSchema = z
    .object({
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        address1: z.string().optional().nullable(),
        address2: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        province: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        zip: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        country_code: z.string().optional().nullable(),
        province_code: z.string().optional().nullable()
    })
    .passthrough();

const ProviderCustomerSchema = z
    .object({
        id: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        phone: z.string().optional().nullable()
    })
    .passthrough();

const ProviderOrderSchema = z
    .object({
        id: z.string(),
        name: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        financial_status: z.string().optional().nullable(),
        fulfillment_status: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        currency: z.string().optional().nullable(),
        subtotal_price: z.string().optional().nullable(),
        total_tax: z.string().optional().nullable(),
        total_price: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        order_at: z.string().optional().nullable(),
        processed_at: z.string().optional().nullable(),
        line_items: z.array(ProviderLineItemSchema).optional().nullable(),
        fulfillments: z.array(ProviderFulfillmentSchema).optional().nullable(),
        refunds: z.array(ProviderRefundSchema).optional().nullable(),
        payment_details: z.array(ProviderPaymentDetailSchema).optional().nullable(),
        shipping_address: ProviderAddressSchema.optional().nullable(),
        billing_address: ProviderAddressSchema.optional().nullable(),
        customer: ProviderCustomerSchema.optional().nullable(),
        tags: z.string().optional().nullable(),
        note: z.string().optional().nullable(),
        buyer_note: z.string().optional().nullable(),
        order_note: z.string().optional().nullable()
    })
    .passthrough();

const LineItemSchema = z
    .object({
        id: z.string().describe('Unique identifier for the line item.'),
        product_id: z.string().optional().describe('The ID of the product associated with this line item.'),
        variant_id: z.string().optional().describe('The ID of the product variant associated with this line item.'),
        title: z.string().optional().describe('The title of the product.'),
        quantity: z.number().optional().describe('The number of items ordered.'),
        price: z.string().optional().describe('The price of the item before discounts and taxes.'),
        sku: z.string().optional().describe('The SKU of the product variant.'),
        variant_title: z.string().optional().describe('The title of the product variant.'),
        vendor: z.string().optional().describe('The name of the vendor.'),
        fulfillment_service: z.string().optional().describe('The service responsible for fulfilling the line item.'),
        grams: z.number().optional().describe('The weight of the line item in grams.')
    })
    .describe('A line item within an order.');

const FulfillmentSchema = z
    .object({
        id: z.string().describe('Unique identifier for the fulfillment.'),
        order_id: z.string().optional().describe('The ID of the order being fulfilled.'),
        status: z.string().optional().describe('The status of the fulfillment.'),
        created_at: z.string().optional().describe('The date and time when the fulfillment was created.'),
        updated_at: z.string().optional().describe('The date and time when the fulfillment was last updated.'),
        tracking_number: z.string().optional().describe('The tracking number for the fulfillment.'),
        tracking_company: z.string().optional().describe('The shipping carrier tracking the fulfillment.')
    })
    .describe('A fulfillment record for an order.');

const RefundLineItemSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the refunded line item.'),
        line_item_id: z.string().optional().describe('The ID of the original line item being refunded.'),
        quantity: z.number().optional().describe('The number of items refunded.')
    })
    .describe('A line item included in a refund.');

const RefundTransactionSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the transaction.'),
        amount: z.string().optional().describe('The monetary amount of the transaction.'),
        status: z.string().optional().describe('The status of the transaction.'),
        kind: z.string().optional().describe('The type of transaction.')
    })
    .describe('A transaction associated with a refund.');

const RefundSchema = z
    .object({
        id: z.string().describe('Unique identifier for the refund.'),
        created_at: z.string().optional().describe('The date and time when the refund was created.'),
        note: z.string().optional().describe('A note attached to the refund.'),
        refund_line_items: z.array(RefundLineItemSchema).optional().describe('The line items included in the refund.'),
        transactions: z.array(RefundTransactionSchema).optional().describe('The transactions associated with the refund.')
    })
    .describe('A refund record for an order.');

const PaymentDetailSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the payment detail.'),
        amount: z.string().optional().describe('The monetary amount of the payment.'),
        status: z.string().optional().describe('The status of the payment.'),
        kind: z.string().optional().describe('The type of payment.'),
        gateway: z.string().optional().describe('The payment gateway used.'),
        created_at: z.string().optional().describe('The date and time when the payment was created.'),
        processed_at: z.string().optional().describe('The date and time when the payment was processed.'),
        currency: z.string().optional().describe('The currency of the payment.')
    })
    .describe('A payment detail record for an order.');

const AddressSchema = z
    .object({
        first_name: z.string().optional().describe('The first name of the recipient.'),
        last_name: z.string().optional().describe('The last name of the recipient.'),
        address1: z.string().optional().describe('The first line of the address.'),
        address2: z.string().optional().describe('The second line of the address.'),
        city: z.string().optional().describe('The city of the address.'),
        province: z.string().optional().describe('The province or state of the address.'),
        country: z.string().optional().describe('The country of the address.'),
        zip: z.string().optional().describe('The postal code of the address.'),
        phone: z.string().optional().describe('The phone number associated with the address.'),
        company: z.string().optional().describe('The company name associated with the address.'),
        email: z.string().optional().describe('The email address associated with the address.'),
        country_code: z.string().optional().describe('The ISO code of the country.'),
        province_code: z.string().optional().describe('The code of the province or state.')
    })
    .describe('A physical address.');

const CustomerSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the customer.'),
        email: z.string().optional().describe('The email address of the customer.'),
        first_name: z.string().optional().describe('The first name of the customer.'),
        last_name: z.string().optional().describe('The last name of the customer.'),
        phone: z.string().optional().describe('The phone number of the customer.')
    })
    .describe('A customer record.');

const OrderSchema = z
    .object({
        id: z.string().describe('Unique identifier for the order.'),
        name: z.string().optional().describe('The name or order number displayed to the customer.'),
        email: z.string().optional().describe('The email address of the customer who placed the order.'),
        financial_status: z.string().optional().describe('The financial status of the order, such as paid or pending.'),
        fulfillment_status: z.string().optional().describe('The fulfillment status of the order, such as fulfilled or unfulfilled.'),
        status: z.string().optional().describe('The overall status of the order.'),
        currency: z.string().optional().describe('The three-letter currency code for the order.'),
        subtotal_price: z.string().optional().describe('The subtotal price of the order before taxes and shipping.'),
        total_tax: z.string().optional().describe('The total tax amount applied to the order.'),
        total_price: z.string().optional().describe('The total price of the order including taxes and discounts.'),
        created_at: z.string().optional().describe('The date and time when the order was created.'),
        updated_at: z.string().optional().describe('The date and time when the order was last updated.'),
        order_at: z.string().optional().describe('The date and time when the order was placed.'),
        processed_at: z.string().optional().describe('The date and time when the order was processed.'),
        line_items: z.array(LineItemSchema).optional().describe('The line items included in the order.'),
        fulfillments: z.array(FulfillmentSchema).optional().describe('The fulfillments associated with the order.'),
        refunds: z.array(RefundSchema).optional().describe('The refunds associated with the order.'),
        payment_details: z.array(PaymentDetailSchema).optional().describe('The payment details associated with the order.'),
        shipping_address: AddressSchema.optional().describe('The shipping address for the order.'),
        billing_address: AddressSchema.optional().describe('The billing address for the order.'),
        customer: CustomerSchema.optional().describe('The customer who placed the order.'),
        tags: z.string().optional().describe('Tags attached to the order, encoded as a JSON string array.'),
        note: z.string().optional().describe('A note attached to the order.'),
        buyer_note: z.string().optional().describe('A note from the buyer.'),
        order_note: z.string().optional().describe('A note from the order.')
    })
    .describe('An order record from the SHOPLINE store, including embedded line items, fulfillments, refunds, and payment details.');

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync orders, including embedded line items, fulfillments, refunds, and payment details.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/order-management/get-orders
            endpoint: '/admin/openapi/v20260601/orders.json',
            params: {
                ...(checkpoint?.updated_after ? { updated_at_min: checkpoint.updated_after } : {})
            },
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'orders',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const orders = ProviderOrderSchema.array().parse(page);

            if (orders.length === 0) {
                continue;
            }

            const mappedOrders = orders.map((order) => ({
                id: order.id,
                ...(order.name != null && { name: order.name }),
                ...(order.email != null && { email: order.email }),
                ...(order.financial_status != null && { financial_status: order.financial_status }),
                ...(order.fulfillment_status != null && { fulfillment_status: order.fulfillment_status }),
                ...(order.status != null && { status: order.status }),
                ...(order.currency != null && { currency: order.currency }),
                ...(order.subtotal_price != null && { subtotal_price: order.subtotal_price }),
                ...(order.total_tax != null && { total_tax: order.total_tax }),
                ...(order.total_price != null && { total_price: order.total_price }),
                ...(order.created_at != null && { created_at: order.created_at }),
                ...(order.updated_at != null && { updated_at: order.updated_at }),
                ...(order.order_at != null && { order_at: order.order_at }),
                ...(order.processed_at != null && { processed_at: order.processed_at }),
                ...(order.line_items != null && {
                    line_items: order.line_items.map((item) => ({
                        id: item.id,
                        ...(item.product_id != null && { product_id: item.product_id }),
                        ...(item.variant_id != null && { variant_id: item.variant_id }),
                        ...(item.title != null && { title: item.title }),
                        ...(item.quantity != null && { quantity: item.quantity }),
                        ...(item.price != null && { price: item.price }),
                        ...(item.sku != null && { sku: item.sku }),
                        ...(item.variant_title != null && { variant_title: item.variant_title }),
                        ...(item.vendor != null && { vendor: item.vendor }),
                        ...(item.fulfillment_service != null && { fulfillment_service: item.fulfillment_service }),
                        ...(item.grams != null && { grams: item.grams })
                    }))
                }),
                ...(order.fulfillments != null && {
                    fulfillments: order.fulfillments.map((f) => ({
                        id: f.id,
                        ...(f.order_id != null && { order_id: f.order_id }),
                        ...(f.status != null && { status: f.status }),
                        ...(f.created_at != null && { created_at: f.created_at }),
                        ...(f.updated_at != null && { updated_at: f.updated_at }),
                        ...(f.tracking_number != null && { tracking_number: f.tracking_number }),
                        ...(f.tracking_company != null && { tracking_company: f.tracking_company })
                    }))
                }),
                ...(order.refunds != null && {
                    refunds: order.refunds.map((r) => ({
                        id: r.id,
                        ...(r.created_at != null && { created_at: r.created_at }),
                        ...(r.note != null && { note: r.note }),
                        ...(r.refund_line_items != null && {
                            refund_line_items: r.refund_line_items.map((rli) => ({
                                ...(rli.id != null && { id: rli.id }),
                                ...(rli.line_item_id != null && { line_item_id: rli.line_item_id }),
                                ...(rli.quantity != null && { quantity: rli.quantity })
                            }))
                        }),
                        ...(r.transactions != null && {
                            transactions: r.transactions.map((rt) => ({
                                ...(rt.id != null && { id: rt.id }),
                                ...(rt.amount != null && { amount: rt.amount }),
                                ...(rt.status != null && { status: rt.status }),
                                ...(rt.kind != null && { kind: rt.kind })
                            }))
                        })
                    }))
                }),
                ...(order.payment_details != null && {
                    payment_details: order.payment_details.map((p) => ({
                        ...(p.id != null && { id: p.id }),
                        ...(p.amount != null && { amount: p.amount }),
                        ...(p.status != null && { status: p.status }),
                        ...(p.kind != null && { kind: p.kind }),
                        ...(p.gateway != null && { gateway: p.gateway }),
                        ...(p.created_at != null && { created_at: p.created_at }),
                        ...(p.processed_at != null && { processed_at: p.processed_at }),
                        ...(p.currency != null && { currency: p.currency })
                    }))
                }),
                ...(order.shipping_address != null && {
                    shipping_address: {
                        ...(order.shipping_address.first_name != null && { first_name: order.shipping_address.first_name }),
                        ...(order.shipping_address.last_name != null && { last_name: order.shipping_address.last_name }),
                        ...(order.shipping_address.address1 != null && { address1: order.shipping_address.address1 }),
                        ...(order.shipping_address.address2 != null && { address2: order.shipping_address.address2 }),
                        ...(order.shipping_address.city != null && { city: order.shipping_address.city }),
                        ...(order.shipping_address.province != null && { province: order.shipping_address.province }),
                        ...(order.shipping_address.country != null && { country: order.shipping_address.country }),
                        ...(order.shipping_address.zip != null && { zip: order.shipping_address.zip }),
                        ...(order.shipping_address.phone != null && { phone: order.shipping_address.phone }),
                        ...(order.shipping_address.company != null && { company: order.shipping_address.company }),
                        ...(order.shipping_address.email != null && { email: order.shipping_address.email }),
                        ...(order.shipping_address.country_code != null && { country_code: order.shipping_address.country_code }),
                        ...(order.shipping_address.province_code != null && { province_code: order.shipping_address.province_code })
                    }
                }),
                ...(order.billing_address != null && {
                    billing_address: {
                        ...(order.billing_address.first_name != null && { first_name: order.billing_address.first_name }),
                        ...(order.billing_address.last_name != null && { last_name: order.billing_address.last_name }),
                        ...(order.billing_address.address1 != null && { address1: order.billing_address.address1 }),
                        ...(order.billing_address.address2 != null && { address2: order.billing_address.address2 }),
                        ...(order.billing_address.city != null && { city: order.billing_address.city }),
                        ...(order.billing_address.province != null && { province: order.billing_address.province }),
                        ...(order.billing_address.country != null && { country: order.billing_address.country }),
                        ...(order.billing_address.zip != null && { zip: order.billing_address.zip }),
                        ...(order.billing_address.phone != null && { phone: order.billing_address.phone }),
                        ...(order.billing_address.company != null && { company: order.billing_address.company }),
                        ...(order.billing_address.email != null && { email: order.billing_address.email }),
                        ...(order.billing_address.country_code != null && { country_code: order.billing_address.country_code }),
                        ...(order.billing_address.province_code != null && { province_code: order.billing_address.province_code })
                    }
                }),
                ...(order.customer != null && {
                    customer: {
                        ...(order.customer.id != null && { id: order.customer.id }),
                        ...(order.customer.email != null && { email: order.customer.email }),
                        ...(order.customer.first_name != null && { first_name: order.customer.first_name }),
                        ...(order.customer.last_name != null && { last_name: order.customer.last_name }),
                        ...(order.customer.phone != null && { phone: order.customer.phone })
                    }
                }),
                ...(order.tags != null && { tags: order.tags }),
                ...(order.note != null && { note: order.note }),
                ...(order.buyer_note != null && { buyer_note: order.buyer_note }),
                ...(order.order_note != null && { order_note: order.order_note })
            }));

            await nango.batchSave(mappedOrders, 'Order');

            const lastOrder = orders[orders.length - 1];
            if (lastOrder && typeof lastOrder.updated_at === 'string') {
                await nango.saveCheckpoint({
                    updated_after: lastOrder.updated_at
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
