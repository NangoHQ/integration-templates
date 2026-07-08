import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSupplierSchema = z.object({
    id: z.number(),
    name: z.string(),
    reg_no: z.string().nullable(),
    vat_number: z.string(),
    emails: z.string().array(),
    iban: z.string(),
    postal_address: z.object({
        address: z.string(),
        postal_code: z.string(),
        city: z.string(),
        country_alpha2: z.string()
    }),
    external_reference: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const PennylaneSupplierSchema = z.object({
    id: z.string(),
    name: z.string(),
    reg_no: z.string().optional(),
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string(),
    recipient: z.string().optional(),
    vat_number: z.string().optional(),
    source_id: z.string().optional(),
    emails: z.string().array(),
    iban: z.string().optional(),
    payment_conditions: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional()
});

function toSupplier(supplier: z.infer<typeof ProviderSupplierSchema>): z.infer<typeof PennylaneSupplierSchema> {
    return {
        id: String(supplier.id),
        name: supplier.name,
        address: supplier.postal_address.address,
        postal_code: supplier.postal_address.postal_code,
        city: supplier.postal_address.city,
        country_alpha2: supplier.postal_address.country_alpha2,
        emails: supplier.emails,
        reg_no: supplier.reg_no ?? undefined,
        vat_number: supplier.vat_number,
        iban: supplier.iban,
        reference: supplier.external_reference,
        recipient: undefined,
        source_id: undefined,
        payment_conditions: undefined,
        phone: undefined,
        notes: undefined
    };
}

const sync = createSync({
    description: 'Fetches a list of suppliers from pennylane',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['suppliers:readonly', 'suppliers:all'],
    metadata: z.object({}),

    models: {
        PennylaneSupplier: PennylaneSupplierSchema
    },

    exec: async (nango) => {
        // The v2 suppliers list endpoint does not support updated_at filtering,
        // so we perform a full refresh with trackDeletes to keep the local cache accurate.
        await nango.trackDeletesStart('PennylaneSupplier');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getsuppliers.md
            endpoint: '/api/external/v2/suppliers',
            retries: 3,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected suppliers page to be an array');
            }

            const parsed = z.array(ProviderSupplierSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse suppliers page: ${parsed.error.message}`);
            }

            const suppliers = parsed.data.map(toSupplier);
            await nango.batchSave(suppliers, 'PennylaneSupplier');
        }

        await nango.trackDeletesEnd('PennylaneSupplier');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
