export interface StripeResponse<T> {
    data: T[];
    has_more: boolean;
    object: string;
    url: string;
}

export interface StripeSubscription {
    id: string;
    object: string;
    application: any;
    application_fee_percent: any;
    automatic_tax: AutomaticTax;
    billing_cycle_anchor: number;
    billing_thresholds: string | null;
    cancel_at: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    cancellation_details: CancellationDetails;
    collection_method: string;
    created: number;
    currency: string;
    current_period_end: number;
    current_period_start: number;
    customer: string;
    days_until_due: number | null;
    default_payment_method: string | null;
    description: string | null;
    discount: string | null;
    discounts: string[] | null;
    ended_at: string | null;
    invoice_settings: InvoiceSettings;
    items: StripeResponse<StripeItem>;
    latest_invoice: string;
    livemode: boolean;
    metadata: unknown;
    next_pending_invoice_item_invoice: any;
    on_behalf_of: any;
    pause_collection: any;
    payment_settings: PaymentSettings;
    pending_invoice_item_interval: any;
    pending_setup_intent: any;
    pending_update: any;
    schedule: any;
    start_date: number;
    status: string;
    test_clock: any;
    transfer_data: string | null;
    trial_end: string | null;
    trial_settings: TrialSettings;
    trial_start: string | null;
}

export interface AutomaticTax {
    disabled_reason: string | null;
    enabled: boolean;
    liability: boolean | string | null;
}

export interface CancellationDetails {
    comment: string | null;
    feedback: string | null;
    reason: string | null;
}

export interface InvoiceSettings {
    issuer: Issuer;
    account_tax_ids: null | string | string[];
}

export interface Issuer {
    type: string;
}

export interface StripeItem {
    id: string;
    object: string;
    billing_thresholds: any;
    created: number;
    metadata: unknown;
    plan: Plan;
    price: Price;
    quantity: number;
    subscription: string;
    tax_rates: any[];
}

export interface Plan {
    id: string;
    object: string;
    active: boolean;
    aggregate_usage: any;
    amount: number;
    amount_decimal: string;
    billing_scheme: string;
    created: number;
    currency: string;
    discounts: any;
    interval: string;
    interval_count: number;
    livemode: boolean;
    metadata: unknown;
    nickname: any;
    product: string;
    tiers_mode: any;
    transform_usage: any;
    trial_period_days: any;
    usage_type: string;
}

export interface Price {
    id: string;
    object: string;
    active: boolean;
    billing_scheme: string;
    created: number;
    currency: string;
    custom_unit_amount: any;
    livemode: boolean;
    lookup_key: any;
    metadata: unknown;
    nickname: any;
    product: string;
    recurring: Recurring;
    tax_behavior: string;
    tiers_mode: any;
    transform_quantity: any;
    type: string;
    unit_amount: number;
    unit_amount_decimal: string;
}

export interface Recurring {
    aggregate_usage: any;
    interval: string;
    interval_count: number;
    trial_period_days: any;
    usage_type: string;
}

export interface PaymentSettings {
    payment_method_options: string | null;
    payment_method_types: string | null;
    save_default_payment_method: string;
}

export interface TrialSettings {
    end_behavior: EndBehavior;
}

export interface EndBehavior {
    missing_payment_method: string;
}
