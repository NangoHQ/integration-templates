import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderSupplierSchema = z.object({
    id: z.number(),
    name: z.string(),
    establishment_no: z.string().nullable().optional(),
    reg_no: z.string().nullable(),
    vat_number: z.string(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional(),
    emails: z.array(z.string()),
    iban: z.string(),
    postal_address: z.object({
        address: z.string(),
        postal_code: z.string(),
        city: z.string(),
        country_alpha2: z.string()
    }),
    supplier_payment_method: z.string().nullable().optional(),
    supplier_due_date_delay: z.number().nullable().optional(),
    supplier_due_date_rule: z.string().nullable().optional(),
    external_reference: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            establishment_no: z.string().optional(),
            reg_no: z.string().optional(),
            vat_number: z.string(),
            ledger_account: z
                .object({
                    id: z.number()
                })
                .optional(),
            emails: z.array(z.string()),
            iban: z.string(),
            postal_address: z.object({
                address: z.string(),
                postal_code: z.string(),
                city: z.string(),
                country_alpha2: z.string()
            }),
            supplier_payment_method: z.string().optional(),
            supplier_due_date_delay: z.number().optional(),
            supplier_due_date_rule: z.string().optional(),
            external_reference: z.string(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List suppliers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsuppliers
            endpoint: '/api/external/v2/suppliers',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const ProviderListResponseSchema = z.object({
            has_more: z.boolean(),
            next_cursor: z.string().nullable(),
            items: z.array(ProviderSupplierSchema)
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                name: item.name,
                ...(item.establishment_no != null && { establishment_no: item.establishment_no }),
                ...(item.reg_no != null && { reg_no: item.reg_no }),
                vat_number: item.vat_number,
                ...(item.ledger_account != null && { ledger_account: item.ledger_account }),
                emails: item.emails,
                iban: item.iban,
                postal_address: item.postal_address,
                ...(item.supplier_payment_method != null && { supplier_payment_method: item.supplier_payment_method }),
                ...(item.supplier_due_date_delay != null && { supplier_due_date_delay: item.supplier_due_date_delay }),
                ...(item.supplier_due_date_rule != null && { supplier_due_date_rule: item.supplier_due_date_rule }),
                external_reference: item.external_reference,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor }),
            has_more: parsed.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
