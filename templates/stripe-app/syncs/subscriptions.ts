import { createSync } from "nango";
import type { StripeResponse, StripeItem, StripeSubscription } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Subscription, Item } from "../models.js";
import { z } from "zod";

const LIMIT = 100;

const sync = createSync({
    description: "Fetches a list of subscriptions",
    version: "0.0.1",
    frequency: "every 2h",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/subscriptions",
        group: "Subscriptions"
    }],

    scopes: ["subscription_read"],

    models: {
        Subscription: Subscription
    },

    metadata: z.object({}),

    exec: async nango => {
        const params: Record<string, string | number> = {
            limit: LIMIT
        };

        const config: ProxyConfiguration = {
            // https://stripe.com/docs/api/subscriptions/list
            endpoint: '/v1/subscriptions',
            params,
            retries: 10
        };

        let hasMore = true;
        let starting_after = '';

        while (hasMore) {
            const response = await nango.get<StripeResponse<StripeSubscription>>(config);

            const { data } = response;

            hasMore = data.has_more;

            // Safely access subscriptions and its last item's id
            if (data.data && data.data.length > 0) {
                const subscriptions = data.data || [];

                const mappedSubscriptions = await Promise.all(
                    subscriptions.map(async (subscription) => ({
                        ...mapSubscriptions(subscription),
                        items: await retrieveAndMapItems(nango, subscription.items)
                    }))
                );
                await nango.batchSave(mappedSubscriptions, 'Subscription');

                const lastIndex = subscriptions.length - 1;
                const lastElement = subscriptions[lastIndex];
                if (!lastElement) {
                    hasMore = false;
                    continue;
                }
                starting_after = lastElement.id;

                params['starting_after'] = starting_after;
            } else {
                hasMore = false;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapSubscriptions(subscription: StripeSubscription): Omit<Subscription, 'items'> {
    return {
        id: subscription.id,
        automatic_tax: subscription.automatic_tax,
        billing_cycle_anchor: subscription.billing_cycle_anchor,
        billing_thresholds: subscription.billing_thresholds,
        cancel_at: subscription.cancel_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
        cancellation_details: subscription.cancellation_details,
        collection_method: subscription.collection_method,
        created: subscription.created,
        currency: subscription.currency,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        customer: subscription.customer,
        days_until_due: subscription.days_until_due,
        default_payment_method: subscription.default_payment_method,
        description: subscription.description,
        discount: subscription.discount,
        discounts: subscription.discounts,
        ended_at: subscription.ended_at,
        invoice_settings: subscription.invoice_settings,
        latest_invoice: subscription.latest_invoice,
        livemode: subscription.livemode,
        next_pending_invoice_item_invoice: subscription.next_pending_invoice_item_invoice,
        on_behalf_of: subscription.on_behalf_of,
        pause_collection: subscription.pause_collection,
        payment_settings: subscription.payment_settings,
        pending_invoice_item_interval: subscription.pending_invoice_item_interval,
        pending_setup_intent: subscription.pending_setup_intent,
        schedule: subscription.schedule,
        start_date: subscription.start_date,
        status: subscription.status,
        transfer_data: subscription.transfer_data,
        trial_end: subscription.trial_end,
        trial_settings: subscription.trial_settings,
        trial_start: subscription.trial_start
    };
}

async function retrieveAndMapItems(nango: NangoSyncLocal, items: StripeResponse<StripeItem>): Promise<Item[]> {
    const allItems: StripeItem[] = [];
    let hasMore = items.has_more;
    let starting_after = '';

    while (hasMore) {
        const params: Record<string, string | number> = {
            limit: LIMIT
        };

        if (starting_after) {
            params['starting_after'] = starting_after;
        }
        const config: ProxyConfiguration = {
            // https://stripe.com/docs/api/subscription_items/list
            endpoint: '/v1/subscription_items',
            params,
            retries: 10
        };

        const response = await nango.get<StripeResponse<StripeItem>>(config);

        const { data } = response.data;
        allItems.push(...data);

        hasMore = response.data.has_more;
        if (hasMore && data.length > 0) {
            const lastIndex = data.length - 1;
            const lastElement = data[lastIndex];
            if (!lastElement) {
                hasMore = false;
                continue;
            }
            starting_after = lastElement.id;
        } else {
            hasMore = false;
        }
    }

    return allItems.map((item: StripeItem) => {
        const itemResponse: Item = {
            id: item.id,
            billing_thresholds: item.billing_thresholds,
            created: item.created,
            plan: item.plan,
            price: item.price,
            quantity: item.quantity,
            subscription: item.subscription,
            tax_rates: item.tax_rates
        };

        return itemResponse;
    });
}
