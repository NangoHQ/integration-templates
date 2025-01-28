import type { RechargeCustomer, RechargeSubscription } from '../types';
import type { Customer } from '../../models';

export function toCustomer(customer: RechargeCustomer, subscriptions: RechargeSubscription[]): Customer {
    return {
        id: customer.id.toString(),
        phone_number: customer.phone,
        first_name: customer.first_name,
        last_name: customer.last_name,
        subscriptions: subscriptions.map((subscription) => ({
            type: `${subscription.order_interval_frequency} ${subscription.order_interval_unit}`,
            name: subscription.product_title,
            start_date: subscription.created_at,
            end_date: subscription.cancelled_at || null
        }))
    };
}
