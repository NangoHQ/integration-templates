import { createSync } from 'nango';
import { toCustomer } from '../mappers/to-customer.js';
import type { RechargeCustomer, RechargeSubscription } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Customer } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Incrementally fetch all Recharge customers and their subscription details.',
    version: '2.0.0',
    frequency: 'every 1 hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/customers',
            group: 'Customers'
        }
    ],

    scopes: ['read_customers', ' read_subscriptions'],

    models: {
        Customer: Customer
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const customerConfig: ProxyConfiguration = {
            // https://developer.rechargepayments.com/2021-11/customers/customers_list
            endpoint: '/customers',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_rel_in_response_header: 'next',
                response_path: 'customers',
                limit: 100
            },
            params: {
                ...(checkpointUpdatedAfter && { updated_at_min: checkpointUpdatedAfter.toISOString() }),
                sort_by: 'created_at-desc'
            },
            retries: 10
        };

        const mappedCustomers: Customer[] = [];

        for await (const customers of nango.paginate<RechargeCustomer>(customerConfig)) {
            for (const customer of customers) {
                const subscriptions = await fetchSubscriptions(customer.id, nango, checkpointUpdatedAfter);
                const mappedForCustomer = toCustomer(customer, subscriptions);
                mappedCustomers.push(mappedForCustomer);
            }
        }
        if (mappedCustomers.length > 0) {
            await nango.batchSave(mappedCustomers, 'Customer');
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchSubscriptions(customerId: number, nango: NangoSyncLocal, checkpointUpdatedAfter?: Date): Promise<any[]> {
    const subscriptionConfig: ProxyConfiguration = {
        // https://developer.rechargepayments.com/2021-11/subscriptions/subscriptions_list
        endpoint: '/subscriptions',
        paginate: {
            type: 'link',
            limit_name_in_request: 'limit',
            link_rel_in_response_header: 'next',
            response_path: 'subscriptions',
            limit: 100
        },
        params: {
            customer_id: customerId,
            sort_by: 'created_at-desc',
            ...(checkpointUpdatedAfter && { updated_at_min: checkpointUpdatedAfter.toISOString() })
        },
        retries: 10
    };

    const subscriptions: RechargeSubscription[] = [];
    for await (const batch of nango.paginate<RechargeSubscription>(subscriptionConfig)) {
        subscriptions.push(...batch);
    }

    return subscriptions;
}
