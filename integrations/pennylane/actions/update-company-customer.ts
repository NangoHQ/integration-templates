import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('Company customer identifier. Example: "1338468995072"'),
    name: z.string().optional(),
    vat_number: z.string().optional(),
    reg_no: z.string().optional(),
    phone: z.string().optional(),
    billing_address: AddressSchema.optional(),
    delivery_address: AddressSchema.nullable().optional(),
    payment_conditions: z
        .enum(['upon_receipt', 'custom', '7_days', '15_days', '30_days', '30_days_end_of_month', '45_days', '45_days_end_of_month', '60_days'])
        .optional(),
    billing_iban: z.string().nullable().optional(),
    recipient: z.string().optional(),
    reference: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    emails: z.array(z.string()).optional(),
    external_reference: z.string().optional(),
    billing_language: z.enum(['fr_FR', 'en_GB', 'de_DE']).optional()
});

const ProviderCompanyCustomerSchema = z.object({
    id: z.number(),
    name: z.string(),
    billing_iban: z.string().nullable(),
    payment_conditions: z.string().optional(),
    recipient: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    vat_number: z.string().optional(),
    reg_no: z.string().optional(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable(),
    emails: z.array(z.string()).optional(),
    billing_address: z
        .object({
            address: z.string(),
            postal_code: z.string(),
            city: z.string(),
            country_alpha2: z.string()
        })
        .optional(),
    delivery_address: z
        .object({
            address: z.string(),
            postal_code: z.string(),
            city: z.string(),
            country_alpha2: z.string()
        })
        .nullable()
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    mandates: z
        .object({
            url: z.string()
        })
        .optional(),
    pro_account_mandates: z
        .object({
            url: z.string()
        })
        .optional(),
    contacts: z
        .object({
            url: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    billing_iban: z.string().nullable().optional(),
    payment_conditions: z.string().optional(),
    recipient: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    vat_number: z.string().optional(),
    reg_no: z.string().optional(),
    emails: z.array(z.string()).optional(),
    billing_address: z
        .object({
            address: z.string(),
            postal_code: z.string(),
            city: z.string(),
            country_alpha2: z.string()
        })
        .optional(),
    delivery_address: z
        .object({
            address: z.string(),
            postal_code: z.string(),
            city: z.string(),
            country_alpha2: z.string()
        })
        .nullable()
        .optional(),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update a company customer',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.vat_number !== undefined) {
            data['vat_number'] = input.vat_number;
        }
        if (input.reg_no !== undefined) {
            data['reg_no'] = input.reg_no;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.billing_address !== undefined) {
            data['billing_address'] = input.billing_address;
        }
        if (input.delivery_address !== undefined) {
            data['delivery_address'] = input.delivery_address;
        }
        if (input.payment_conditions !== undefined) {
            data['payment_conditions'] = input.payment_conditions;
        }
        if (input.billing_iban !== undefined) {
            data['billing_iban'] = input.billing_iban;
        }
        if (input.recipient !== undefined) {
            data['recipient'] = input.recipient;
        }
        if (input.reference !== undefined) {
            data['reference'] = input.reference;
        }
        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.emails !== undefined) {
            data['emails'] = input.emails;
        }
        if (input.external_reference !== undefined) {
            data['external_reference'] = input.external_reference;
        }
        if (input.billing_language !== undefined) {
            data['billing_language'] = input.billing_language;
        }

        // https://pennylane.readme.io/reference/putcompanycustomer
        const response = await nango.put({
            endpoint: `/api/external/v2/company_customers/${encodeURIComponent(input.id)}`,
            data,
            retries: 1
        });

        const providerCustomer = ProviderCompanyCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            name: providerCustomer.name,
            ...(providerCustomer.billing_iban !== null && { billing_iban: providerCustomer.billing_iban }),
            ...(providerCustomer.payment_conditions !== undefined && { payment_conditions: providerCustomer.payment_conditions }),
            ...(providerCustomer.recipient !== undefined && { recipient: providerCustomer.recipient }),
            ...(providerCustomer.phone !== undefined && { phone: providerCustomer.phone }),
            ...(providerCustomer.reference !== null && { reference: providerCustomer.reference }),
            ...(providerCustomer.notes !== null && { notes: providerCustomer.notes }),
            ...(providerCustomer.vat_number !== undefined && { vat_number: providerCustomer.vat_number }),
            ...(providerCustomer.reg_no !== undefined && { reg_no: providerCustomer.reg_no }),
            ...(providerCustomer.emails !== undefined && { emails: providerCustomer.emails }),
            ...(providerCustomer.billing_address !== undefined && { billing_address: providerCustomer.billing_address }),
            ...(providerCustomer.delivery_address !== undefined && { delivery_address: providerCustomer.delivery_address }),
            ...(providerCustomer.external_reference !== undefined && { external_reference: providerCustomer.external_reference }),
            ...(providerCustomer.billing_language !== undefined && { billing_language: providerCustomer.billing_language }),
            ...(providerCustomer.created_at !== undefined && { created_at: providerCustomer.created_at }),
            ...(providerCustomer.updated_at !== undefined && { updated_at: providerCustomer.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
