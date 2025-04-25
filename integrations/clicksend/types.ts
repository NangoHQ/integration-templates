export interface ClickSendSms {
    direction: 'out' | 'in';
    date: number;
    to: string;
    body: string;
    from: string;
    schedule: number | string;
    message_id: string;
    message_parts: number;
    message_price: string;
    from_email: string | null;
    list_id: string | null;
    custom_string: string;
    contact_id: number | null;
    user_id: number;
    subaccount_id: number;
    country: string;
    carrier: string;
    status: 'QUEUED' | 'COMPLETED' | 'SCHEDULED' | 'WAIT_APPROVAL' | 'FAILED' | 'CANCELLED' | 'CANCELLED_AFTER_REVIEW' | 'RECEIVED' | 'SENT';

    // Optional only for history endpoint
    is_shared_system_number?: boolean;
    status_code?: string;
    status_text?: string;
    error_code?: string;
    error_text?: string;
    first_name?: string | null;
    last_name?: string | null;
    _api_username?: string;
}

export interface ClickSendAccount {
    user_id: number;
    username: string;
    user_email: string;
    active: number;
    banned: number;
    balance: string;
    user_phone: string;
    reply_to: string;
    delivery_to: string | null;
    user_first_name: string;
    user_last_name: string;
    account: number;
    account_name: string;
    account_billing_email: string;
    account_billing_mobile: string;
    country: string;
    default_country_sms: string;
    auto_recharge: number;
    auto_recharge_amount: string;
    low_credit_amount: string;
    setting_unicode_sms: number;
    setting_email_sms_subject: number;
    setting_fix_sender_id: number;
    setting_sms_message_char_limit: number;
    old_dashboard: number;
    balance_commission: string;
    timezone: string;
    _currency: Record<string, unknown>; // Expand if structure is known
    _subaccount: Record<string, unknown>; // Expand if structure is known
}
