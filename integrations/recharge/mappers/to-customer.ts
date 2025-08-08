import type { RechargeCustomer, RechargeSubscription } from '../types.js';
import type { Customer } from '../models.js';

export function toCustomer(customer: RechargeCustomer, subscriptions: RechargeSubscription[]): Customer {
    return {
        id: customer.id.toString(),
        phone_number: customer.phone,
        first_name: customer.first_name,
        email: customer.email,
        last_name: customer.last_name,
        subscriptions: subscriptions.map((subscription) => ({
            id: subscription.id.toString(),
            type: `${subscription.order_interval_frequency} ${subscription.order_interval_unit}`,
            name: subscription.product_title,
            start_date: subscription.created_at,
            end_date: subscription.cancelled_at || null,
            next_charge_scheduled_at: subscription.next_charge_scheduled_at
        }))
    };
}
