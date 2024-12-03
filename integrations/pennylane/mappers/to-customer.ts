import type { PennylaneCustomer, PennylaneIndividualCustomer } from '../../models.js';

export function toCustomer(customer: PennylaneIndividualCustomer): PennylaneCustomer {
    return {
        id: customer.source_id!,
        address: customer?.address ?? '',
        billing_iban: customer.billing_iban ?? '',
        city: customer?.city ?? '',
        country_alpha2: customer?.country_alpha2 ?? '',
        emails: customer.emails ?? [],
        first_name: customer?.first_name ?? '',
        last_name: customer.last_name ?? '',
        source_id: customer.source_id ?? '',
        phone: customer.phone ?? '',
        gender: customer?.gender ?? '',
        notes: customer.notes ?? '',
        postal_code: customer?.postal_code ?? '',
        delivery_postal_code: customer.postal_code ?? '',
        payment_conditions: customer.payment_conditions ?? '',
        reference: customer.reference ?? '',
        vat_number: customer.vat_number ?? null
    };
}
