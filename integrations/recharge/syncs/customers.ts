import type { NangoSync, Customer, ProxyConfiguration } from '../../models';
import { toCustomer } from '../mappers/to-customer.js';
import type { RechargeCustomer, RechargeSubscription } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
            ...(nango.lastSyncDate && { updated_at_min: nango.lastSyncDate.toISOString() }),
            sort_by: 'created_at-desc'
        },
        retries: 10
    };

    const mappedCustomers: Customer[] = [];

    for await (const customers of nango.paginate<RechargeCustomer>(customerConfig)) {
        for (const customer of customers) {
            const subscriptions = await fetchSubscriptions(customer.id, nango);
            const mappedForCustomer = toCustomer(customer, subscriptions);
            mappedCustomers.push(mappedForCustomer);
        }
    }
    if (mappedCustomers.length > 0) {
        await nango.batchSave(mappedCustomers, 'Customer');
    }
}

async function fetchSubscriptions(customerId: number, nango: NangoSync): Promise<any[]> {
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
            ...(nango.lastSyncDate && { updated_at_min: nango.lastSyncDate.toISOString() })
        },
        retries: 10
    };

    const subscriptions: RechargeSubscription[] = [];
    for await (const batch of nango.paginate<RechargeSubscription>(subscriptionConfig)) {
        subscriptions.push(...batch);
    }

    return subscriptions;
}
