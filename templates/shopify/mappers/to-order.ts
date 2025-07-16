import type { Order } from ../models.js;
import type { ShopifyOrder } from '../types.js';

export function toOrder(shopifyOrder: ShopifyOrder): Order {
    const lineItems = shopifyOrder.lineItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        original_total_set: {
            amount: item.originalTotalSet.presentmentMoney.amount,
            currency_code: item.originalTotalSet.presentmentMoney.currencyCode
        },
        discounted_total_set: {
            amount: item.discountedTotalSet.presentmentMoney.amount,
            currency_code: item.discountedTotalSet.presentmentMoney.currencyCode
        }
    }));

    return {
        id: shopifyOrder.id,
        name: shopifyOrder.name,
        created_at: shopifyOrder.createdAt,
        updated_at: shopifyOrder.updatedAt,
        processed_at: shopifyOrder.processedAt,
        currency_code: shopifyOrder.currencyCode,
        presentment_currency_code: shopifyOrder.presentmentCurrencyCode,
        confirmed: shopifyOrder.confirmed,
        cancelled_at: shopifyOrder.cancelledAt,
        cancel_reason: shopifyOrder.cancelReason,
        closed: shopifyOrder.closed,
        closed_at: shopifyOrder.closedAt,
        fully_paid: shopifyOrder.fullyPaid,
        customer: shopifyOrder.customer
            ? {
                  first_name: shopifyOrder.customer.firstName,
                  last_name: shopifyOrder.customer.lastName,
                  display_name: shopifyOrder.customer.displayName,
                  email: shopifyOrder.customer.email,
                  phone: shopifyOrder.customer.phone
              }
            : null,
        total_price_set: {
            amount: shopifyOrder.totalReceivedSet.presentmentMoney.amount,
            currency_code: shopifyOrder.totalReceivedSet.presentmentMoney.currencyCode
        },
        subtotal_price_set: {
            amount: shopifyOrder.subtotalPriceSet.presentmentMoney.amount,
            currency_code: shopifyOrder.subtotalPriceSet.presentmentMoney.currencyCode
        },
        total_tax_set: {
            amount: shopifyOrder.totalTaxSet.presentmentMoney.amount,
            currency_code: shopifyOrder.totalTaxSet.presentmentMoney.currencyCode
        },
        shipping_address: shopifyOrder.shippingAddress
            ? {
                  address1: shopifyOrder.shippingAddress.address1,
                  address2: shopifyOrder.shippingAddress.address2,
                  city: shopifyOrder.shippingAddress.city,
                  country: shopifyOrder.shippingAddress.country,
                  province: shopifyOrder.shippingAddress.province,
                  zip: shopifyOrder.shippingAddress.zip
              }
            : null,
        billing_address: shopifyOrder.billingAddress
            ? {
                  address1: shopifyOrder.billingAddress.address1,
                  address2: shopifyOrder.billingAddress.address2,
                  city: shopifyOrder.billingAddress.city,
                  country: shopifyOrder.billingAddress.country,
                  province: shopifyOrder.billingAddress.province,
                  zip: shopifyOrder.billingAddress.zip
              }
            : null,
        line_item: lineItems
    };
}
