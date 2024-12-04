export interface Customer {
    name: string;
    reg_no: string;
    vat_number: string;
    updated_at?: string; // ISO 8601 date string
    source_id: string;
    emails: string[];
    billing_iban: string;
    customer_type: 'company' | 'individual';
    recipient?: string;
    billing_address: Address;
    delivery_address: Address;
    payment_conditions?: string;
    phone?: string;
    reference?: string;
    notes?: string;
    plan_item?: PlanItem;
    mandates?: Mandate[];
    first_name?: string;
    last_name?: string;
    gender?: string;
}

interface Address {
    address: string;
    postal_code: string;
    city: string;
    country_alpha2: string;
}

interface PlanItem {
    number: string;
    label: string;
    enabled: boolean;
    vat_rate: string;
    country_alpha2: string;
    description: string;
}

interface Mandate {
    provider?: string;
    source_id: string;
}
