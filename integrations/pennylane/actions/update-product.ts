import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Product ID. Example: 87538491392'),
    label: z.string().optional().describe('Product label'),
    description: z.string().optional().describe('Product description. Maximum 5,000 characters.'),
    external_reference: z.string().optional().describe('The unique external reference assigned to this product.'),
    price_before_tax: z.string().optional().describe('Product price without taxes. Example: "100.00"'),
    vat_rate: z.string().optional().describe('Product VAT rate. A 20% VAT in France is FR_200.'),
    unit: z.string().optional().describe('Product unit. Example: "piece"'),
    currency: z.string().optional().describe('Product currency. Default: EUR'),
    reference: z.string().optional().describe('Product reference. Example: "REF-123"'),
    ledger_account_id: z.number().int().optional().describe('Ledger account ID')
});

const ProviderProductSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    description: z.string(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().nullable(),
    ledger_account: z
        .object({
            id: z.number().int()
        })
        .nullable(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    description: z.string(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().optional(),
    ledger_account_id: z.number().int().optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update a product in Pennylane',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putproduct.md
            endpoint: `/api/external/v2/products/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.label !== undefined && { label: input.label }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.external_reference !== undefined && { external_reference: input.external_reference }),
                ...(input.price_before_tax !== undefined && { price_before_tax: input.price_before_tax }),
                ...(input.vat_rate !== undefined && { vat_rate: input.vat_rate }),
                ...(input.unit !== undefined && { unit: input.unit }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.reference !== undefined && { reference: input.reference }),
                ...(input.ledger_account_id !== undefined && { ledger_account_id: input.ledger_account_id })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found or update failed',
                id: input.id
            });
        }

        const product = ProviderProductSchema.parse(response.data);

        return {
            id: product.id,
            label: product.label,
            description: product.description,
            external_reference: product.external_reference,
            price_before_tax: product.price_before_tax,
            vat_rate: product.vat_rate,
            price: product.price,
            unit: product.unit,
            currency: product.currency,
            ...(product.reference != null && { reference: product.reference }),
            ...(product.ledger_account != null && { ledger_account_id: product.ledger_account.id }),
            ...(product.archived_at != null && { archived_at: product.archived_at }),
            created_at: product.created_at,
            updated_at: product.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
