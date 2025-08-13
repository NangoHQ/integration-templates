import type { PennylaneSupplier } from '../models.js';

export function toSupplier(supplier: PennylaneSupplier): PennylaneSupplier {
    return {
        id: supplier.source_id!,
        address: supplier?.address ?? '',
        name: supplier.name ?? '',
        city: supplier?.city ?? '',
        country_alpha2: supplier?.country_alpha2 ?? '',
        emails: supplier.emails ?? [],
        iban: supplier.iban ?? '',
        source_id: supplier.source_id ?? '',
        phone: supplier.phone ?? '',
        notes: supplier.notes ?? '',
        postal_code: supplier?.postal_code ?? '',
        recipient: supplier.recipient ?? '',
        reg_no: supplier.reg_no ?? '',
        payment_conditions: supplier.payment_conditions ?? '',
        reference: supplier.reference ?? '',
        vat_number: supplier.vat_number ?? ''
    };
}
