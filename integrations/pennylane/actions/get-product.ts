import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product ID. Example: 87538491392')
});

const ProviderProductSchema = z.object({
    id: z.number(),
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
            id: z.number()
        })
        .nullable(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    description: z.string(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().optional(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getproduct
            endpoint: `/api/external/v2/products/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found or invalid response',
                id: input.id
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            label: providerProduct.label,
            description: providerProduct.description,
            external_reference: providerProduct.external_reference,
            price_before_tax: providerProduct.price_before_tax,
            vat_rate: providerProduct.vat_rate,
            price: providerProduct.price,
            unit: providerProduct.unit,
            currency: providerProduct.currency,
            ...(providerProduct.reference != null && { reference: providerProduct.reference }),
            ...(providerProduct.ledger_account != null && { ledger_account: providerProduct.ledger_account }),
            ...(providerProduct.archived_at != null && { archived_at: providerProduct.archived_at }),
            created_at: providerProduct.created_at,
            updated_at: providerProduct.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
