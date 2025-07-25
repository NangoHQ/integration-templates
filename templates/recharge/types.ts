export interface RechargeCustomer {
    accepts_marketing: number | null;
    analytics_data: {
        utm_params: {
            utm_campaign?: string;
            utm_content?: string;
            utm_data_source?: string;
            utm_source?: string;
            utm_medium?: string;
            utm_term?: string;
            utm_timestamp?: string;
        }[];
    };
    billing_address1: string | null;
    billing_address2: string | null;
    billing_city: string | null;
    billing_company: string | null;
    billing_country: string | null;
    billing_phone: string | null;
    billing_province: string | null;
    billing_zip: string | null;
    created_at: string;
    email: string;
    first_charge_processed_at: string | null;
    first_name: string;
    has_card_error_in_dunning: boolean;
    has_valid_payment_method: boolean;
    hash: string;
    id: number;
    last_name: string;
    number_active_subscriptions: number;
    number_subscriptions: number;
    phone: string | null;
    processor_type: string | null;
    reason_payment_method_not_valid: string | null;
    shopify_customer_id: string;
    status: string;
    tax_exempt: boolean;
    updated_at: string;
    apply_credit_to_next_recurring_charge?: boolean;
    external_customer_id?: {
        ecommerce: string;
    };
    has_payment_method_in_dunning?: boolean;
    subscriptions_active_count?: number;
    subscriptions_total_count?: number;
    subscription_related_charge_streak?: number;
}

export interface RechargeSubscription {
    address_id: number;
    analytics_data: {
        utm_params: {
            utm_campaign?: string;
            utm_content?: string;
            utm_data_source?: string;
            utm_source?: string;
            utm_medium?: string;
            utm_term?: string;
            utm_timestamp?: string;
        }[];
    };
    cancellation_reason: string | null;
    cancellation_reason_comments: string | null;
    cancelled_at: string | null;
    charge_interval_frequency: string;
    created_at: string;
    customer_id: number;
    email: string;
    expire_after_specific_number_of_charges: number | null;
    has_queued_charges: number;
    id: number;
    is_prepaid: boolean;
    is_skippable: boolean;
    is_swappable: boolean;
    max_retries_reached: number;
    next_charge_scheduled_at: string | null;
    order_day_of_month: number | null;
    order_day_of_week: number | null;
    order_interval_frequency: string;
    order_interval_unit: 'day' | 'week' | 'month';
    presentment_currency: string;
    price: number;
    product_title: string;
    properties: {
        name: string;
        value: string;
    }[];
    quantity: number;
    recharge_product_id: number;
    shopify_product_id: number;
    shopify_variant_id: number;
    sku: string | null;
    sku_override: boolean;
    status: 'active' | 'cancelled' | 'expired';
    updated_at: string;
    variant_title: string;
    external_product_id?: {
        ecommerce: string;
    };
    external_variant_id?: {
        ecommerce: string;
    };
}
