import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label: z.string().min(1, 'label is required').describe('Product label. Example: "Consulting Services"'),
    price_before_tax: z.string().min(1, 'price_before_tax is required').describe('Product price without taxes. Example: "100.00"'),
    vat_rate: z.string().min(1, 'vat_rate is required').describe('Product VAT rate. A 20% VAT in France is FR_200. Example: "FR_200"'),
    description: z.string().optional().describe('Product description. Maximum 5,000 characters.'),
    external_reference: z.string().optional().describe('Unique external reference. If not provided, Pennylane will assign one.'),
    unit: z.string().optional().describe('Product unit. Example: "piece"'),
    currency: z.string().optional().describe('Product currency. Defaults to EUR.'),
    reference: z.string().optional().describe('Product reference. Example: "REF-123"'),
    ledger_account_id: z.number().optional().describe('Ledger account ID to associate with the product. Example: 42')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    label: z.string(),
    description: z.string().optional(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().nullable().optional(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().describe('Product ID. Example: 1'),
    label: z.string().describe('Product label.'),
    description: z.string().optional().describe('Product description.'),
    external_reference: z.string().describe('Unique external reference.'),
    price_before_tax: z.string().describe('Product price without taxes.'),
    vat_rate: z.string().describe('Product VAT rate.'),
    price: z.string().describe('Product price with taxes.'),
    unit: z.string().describe('Product unit.'),
    currency: z.string().describe('Product currency.'),
    reference: z.string().optional().describe('Product reference.'),
    ledger_account_id: z.number().optional().describe('Associated ledger account ID.'),
    archived_at: z.string().optional().describe('Archive timestamp if archived.'),
    created_at: z.string().describe('Creation timestamp.'),
    updated_at: z.string().describe('Last update timestamp.')
});

const action = createAction({
    description: 'Create a product in Pennylane',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            label: input.label,
            price_before_tax: input.price_before_tax,
            vat_rate: input.vat_rate,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.external_reference !== undefined && { external_reference: input.external_reference }),
            ...(input.unit !== undefined && { unit: input.unit }),
            ...(input.currency !== undefined && { currency: input.currency }),
            ...(input.reference !== undefined && { reference: input.reference }),
            ...(input.ledger_account_id !== undefined && { ledger_account_id: input.ledger_account_id })
        };

        // https://pennylane.readme.io/reference/postproducts-1
        const response = await nango.post({
            endpoint: '/api/external/v2/products',
            data: body,
            retries: 3
        });

        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            label: providerProduct.label,
            ...(providerProduct.description != null && providerProduct.description !== '' && { description: providerProduct.description }),
            external_reference: providerProduct.external_reference,
            price_before_tax: providerProduct.price_before_tax,
            vat_rate: providerProduct.vat_rate,
            price: providerProduct.price,
            unit: providerProduct.unit,
            currency: providerProduct.currency,
            ...(providerProduct.reference != null && { reference: providerProduct.reference }),
            ...(providerProduct.ledger_account != null && { ledger_account_id: providerProduct.ledger_account.id }),
            ...(providerProduct.archived_at != null && { archived_at: providerProduct.archived_at }),
            created_at: providerProduct.created_at,
            updated_at: providerProduct.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
