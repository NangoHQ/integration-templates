import type { PennylaneProduct } from ../models.js;

export function toProduct(product: PennylaneProduct): PennylaneProduct {
    return {
        id: product.source_id,
        source_id: product.source_id,
        label: product.label,
        description: product.description ?? '',
        unit: product.unit,
        price_before_tax: product.price_before_tax ?? product.price,
        price: product.price,
        vat_rate: product.vat_rate,
        currency: product.currency,
        reference: product.reference ?? '',
        substance: product.substance ?? ''
    };
}
