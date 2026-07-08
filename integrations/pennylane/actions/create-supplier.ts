import { z } from 'zod';
import { createAction } from 'nango';

const SupplierPaymentMethodEnum = z.enum(['automatic_transfer', 'manual_transfer', 'automatic_debiting', 'bill_of_exchange', 'check', 'cash', 'card', 'other']);

const SupplierDueDateRuleEnum = z.enum(['days', 'days_or_end_of_month']);

const InputSchema = z.object({
    name: z.string().describe('Supplier name. Example: "Office Supplies SARL"'),
    establishment_no: z.string().nullable().optional().describe('Supplier identification number (SIRET). 14-digit number. Example: "82762938500014"'),
    reg_no: z.string().optional().describe('Supplier registration number (SIREN). 9-digit number. Example: "827629385"'),
    postal_address: z
        .object({
            address: z.string(),
            postal_code: z.string(),
            city: z.string(),
            country_alpha2: z.string()
        })
        .optional()
        .describe('Postal address. All fields required when provided.'),
    vat_number: z.string().optional().describe('VAT number. Example: "FR32123456789"'),
    emails: z.array(z.string()).optional().describe('Email addresses. Example: ["hello@example.org"]'),
    iban: z.string().optional().describe('IBAN. Example: "FR3330002005500000157841Z25"'),
    supplier_payment_method: SupplierPaymentMethodEnum.nullable().optional(),
    supplier_due_date_delay: z.number().nullable().optional().describe('Due date delay in days. Example: 30'),
    supplier_due_date_rule: SupplierDueDateRuleEnum.nullable().optional(),
    external_reference: z.string().optional().describe('Unique external reference. Example: "FR123"')
});

const ProviderPostalAddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const ProviderSupplierSchema = z.object({
    id: z.number(),
    name: z.string(),
    establishment_no: z.string().nullable(),
    reg_no: z.string().nullable(),
    vat_number: z.string(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable(),
    emails: z.array(z.string()),
    iban: z.string(),
    postal_address: ProviderPostalAddressSchema,
    supplier_payment_method: SupplierPaymentMethodEnum.nullable(),
    supplier_due_date_delay: z.number().nullable(),
    supplier_due_date_rule: SupplierDueDateRuleEnum.nullable(),
    external_reference: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    establishment_no: z.string().nullable().optional(),
    reg_no: z.string().nullable().optional(),
    vat_number: z.string().optional(),
    ledger_account_id: z.number().nullable().optional(),
    emails: z.array(z.string()).optional(),
    iban: z.string().optional(),
    postal_address: ProviderPostalAddressSchema.optional(),
    supplier_payment_method: SupplierPaymentMethodEnum.nullable().optional(),
    supplier_due_date_delay: z.number().nullable().optional(),
    supplier_due_date_rule: SupplierDueDateRuleEnum.nullable().optional(),
    external_reference: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a supplier in Pennylane',
    version: '4.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            name: input.name,
            ...(input.establishment_no !== undefined && { establishment_no: input.establishment_no }),
            ...(input.reg_no !== undefined && { reg_no: input.reg_no }),
            ...(input.postal_address !== undefined && { postal_address: input.postal_address }),
            ...(input.vat_number !== undefined && { vat_number: input.vat_number }),
            ...(input.emails !== undefined && { emails: input.emails }),
            ...(input.iban !== undefined && { iban: input.iban }),
            ...(input.supplier_payment_method !== undefined && { supplier_payment_method: input.supplier_payment_method }),
            ...(input.supplier_due_date_delay !== undefined && { supplier_due_date_delay: input.supplier_due_date_delay }),
            ...(input.supplier_due_date_rule !== undefined && { supplier_due_date_rule: input.supplier_due_date_rule }),
            ...(input.external_reference !== undefined && { external_reference: input.external_reference })
        };

        const response = await nango.post({
            // https://pennylane.readme.io/reference/postsupplier
            endpoint: '/api/external/v2/suppliers',
            data,
            retries: 1
        });

        const providerSupplier = ProviderSupplierSchema.parse(response.data);

        return {
            id: providerSupplier.id,
            name: providerSupplier.name,
            ...(providerSupplier.establishment_no != null && { establishment_no: providerSupplier.establishment_no }),
            ...(providerSupplier.reg_no != null && { reg_no: providerSupplier.reg_no }),
            ...(providerSupplier.vat_number && { vat_number: providerSupplier.vat_number }),
            ...(providerSupplier.ledger_account != null && { ledger_account_id: providerSupplier.ledger_account.id }),
            ...(providerSupplier.emails && { emails: providerSupplier.emails }),
            ...(providerSupplier.iban && { iban: providerSupplier.iban }),
            ...(providerSupplier.postal_address && { postal_address: providerSupplier.postal_address }),
            ...(providerSupplier.supplier_payment_method != null && { supplier_payment_method: providerSupplier.supplier_payment_method }),
            ...(providerSupplier.supplier_due_date_delay != null && { supplier_due_date_delay: providerSupplier.supplier_due_date_delay }),
            ...(providerSupplier.supplier_due_date_rule != null && { supplier_due_date_rule: providerSupplier.supplier_due_date_rule }),
            ...(providerSupplier.external_reference && { external_reference: providerSupplier.external_reference }),
            ...(providerSupplier.created_at && { created_at: providerSupplier.created_at }),
            ...(providerSupplier.updated_at && { updated_at: providerSupplier.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
