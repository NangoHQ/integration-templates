import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Supplier identifier. Example: 1338485968896')
});

const PostalAddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const ProviderSupplierSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    establishment_no: z.string().nullish(),
    reg_no: z.string().nullable(),
    vat_number: z.string(),
    ledger_account: z
        .object({
            id: z.number().int()
        })
        .nullable(),
    emails: z.array(z.string()),
    iban: z.string(),
    postal_address: PostalAddressSchema,
    supplier_payment_method: z.string().nullish(),
    supplier_due_date_delay: z.number().int().nullish(),
    supplier_due_date_rule: z.string().nullable(),
    external_reference: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    establishment_no: z.string().optional(),
    reg_no: z.string().optional(),
    vat_number: z.string(),
    ledger_account: z
        .object({
            id: z.number().int()
        })
        .optional(),
    emails: z.array(z.string()),
    iban: z.string(),
    postal_address: PostalAddressSchema,
    supplier_payment_method: z.string().optional(),
    supplier_due_date_delay: z.number().int().optional(),
    supplier_due_date_rule: z.string().optional(),
    external_reference: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve a supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:readonly'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsupplier
            endpoint: `/api/external/v2/suppliers/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Supplier not found.',
                id: input.id
            });
        }

        const providerSupplier = ProviderSupplierSchema.parse(response.data);

        return {
            id: providerSupplier.id,
            name: providerSupplier.name,
            ...(providerSupplier.establishment_no != null && { establishment_no: providerSupplier.establishment_no }),
            ...(providerSupplier.reg_no != null && { reg_no: providerSupplier.reg_no }),
            vat_number: providerSupplier.vat_number,
            ...(providerSupplier.ledger_account != null && { ledger_account: providerSupplier.ledger_account }),
            emails: providerSupplier.emails,
            iban: providerSupplier.iban,
            postal_address: providerSupplier.postal_address,
            ...(providerSupplier.supplier_payment_method != null && { supplier_payment_method: providerSupplier.supplier_payment_method }),
            ...(providerSupplier.supplier_due_date_delay != null && { supplier_due_date_delay: providerSupplier.supplier_due_date_delay }),
            ...(providerSupplier.supplier_due_date_rule != null && { supplier_due_date_rule: providerSupplier.supplier_due_date_rule }),
            external_reference: providerSupplier.external_reference,
            created_at: providerSupplier.created_at,
            updated_at: providerSupplier.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
