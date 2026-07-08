import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Supplier name. Example: "Office Supplies SARL"'),
    email: z.string().optional().describe('Supplier email address'),
    phone: z.string().optional().describe('Supplier phone number'),
    address: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    postal_code: z.string().optional().describe('Postal code'),
    country: z.string().optional().describe('Country code (ISO 3166-1 alpha-2). Example: "FR"'),
    vat_number: z.string().optional().describe('VAT number'),
    source_id: z.string().optional().describe('External source identifier'),
    reference: z.string().optional().describe('Internal reference')
});

const ProviderSupplierSchema = z
    .object({
        id: z.union([z.string(), z.number()]).transform((val) => String(val)),
        name: z.string(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        postal_code: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        vat_number: z.string().nullable().optional(),
        source_id: z.string().nullable().optional(),
        reference: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    vat_number: z.string().optional(),
    source_id: z.string().optional(),
    reference: z.string().optional()
});

function normalizeSupplier(providerSupplier: z.infer<typeof ProviderSupplierSchema>): z.infer<typeof OutputSchema> {
    return {
        id: providerSupplier.id,
        name: providerSupplier.name,
        ...(providerSupplier.email != null && { email: providerSupplier.email }),
        ...(providerSupplier.phone != null && { phone: providerSupplier.phone }),
        ...(providerSupplier.address != null && { address: providerSupplier.address }),
        ...(providerSupplier.city != null && { city: providerSupplier.city }),
        ...(providerSupplier.postal_code != null && { postal_code: providerSupplier.postal_code }),
        ...(providerSupplier.country != null && { country: providerSupplier.country }),
        ...(providerSupplier.vat_number != null && { vat_number: providerSupplier.vat_number }),
        ...(providerSupplier.source_id != null && { source_id: providerSupplier.source_id }),
        ...(providerSupplier.reference != null && { reference: providerSupplier.reference })
    };
}

const action = createAction({
    description: 'Create a supplier in Pennylane',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            name: input.name,
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.address !== undefined && { address: input.address }),
            ...(input.city !== undefined && { city: input.city }),
            ...(input.postal_code !== undefined && { postal_code: input.postal_code }),
            ...(input.country !== undefined && { country: input.country }),
            ...(input.vat_number !== undefined && { vat_number: input.vat_number }),
            ...(input.source_id !== undefined && { source_id: input.source_id }),
            ...(input.reference !== undefined && { reference: input.reference })
        };

        const response = await nango.post({
            // https://pennylane.readme.io/reference/postsupplier
            endpoint: '/api/external/v2/suppliers',
            data: payload,
            retries: 1
        });

        const providerSupplier = ProviderSupplierSchema.parse(response.data);

        return normalizeSupplier(providerSupplier);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
