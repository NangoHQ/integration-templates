import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Company customer identifier. Example: "1338468995072"')
});

const AddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const UrlResourceSchema = z.object({
    url: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    billing_iban: z.string().optional(),
    payment_conditions: z.string(),
    recipient: z.string(),
    phone: z.string(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    vat_number: z.string(),
    reg_no: z.string(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .optional(),
    emails: z.array(z.string()),
    billing_address: AddressSchema.nullable().optional(),
    delivery_address: AddressSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    external_reference: z.string(),
    billing_language: z.string(),
    mandates: UrlResourceSchema,
    pro_account_mandates: UrlResourceSchema,
    contacts: UrlResourceSchema
});

const ProviderCompanyCustomerSchema = z.object({
    id: z.number(),
    name: z.string(),
    billing_iban: z.string().nullable(),
    payment_conditions: z.string(),
    recipient: z.string(),
    phone: z.string(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    vat_number: z.string(),
    reg_no: z.string(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable(),
    emails: z.array(z.string()),
    billing_address: AddressSchema.nullable().optional(),
    delivery_address: AddressSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    external_reference: z.string(),
    billing_language: z.string(),
    mandates: UrlResourceSchema,
    pro_account_mandates: UrlResourceSchema,
    contacts: UrlResourceSchema
});

const action = createAction({
    description: 'Retrieve a company customer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcompanycustomer
            endpoint: `/api/external/v2/company_customers/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company customer not found',
                id: input.id
            });
        }

        const providerCustomer = ProviderCompanyCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            name: providerCustomer.name,
            ...(providerCustomer.billing_iban != null && { billing_iban: providerCustomer.billing_iban }),
            payment_conditions: providerCustomer.payment_conditions,
            recipient: providerCustomer.recipient,
            phone: providerCustomer.phone,
            ...(providerCustomer.reference != null && { reference: providerCustomer.reference }),
            ...(providerCustomer.notes != null && { notes: providerCustomer.notes }),
            vat_number: providerCustomer.vat_number,
            reg_no: providerCustomer.reg_no,
            ...(providerCustomer.ledger_account != null && { ledger_account: providerCustomer.ledger_account }),
            emails: providerCustomer.emails,
            billing_address: providerCustomer.billing_address,
            delivery_address: providerCustomer.delivery_address,
            created_at: providerCustomer.created_at,
            updated_at: providerCustomer.updated_at,
            external_reference: providerCustomer.external_reference,
            billing_language: providerCustomer.billing_language,
            mandates: providerCustomer.mandates,
            pro_account_mandates: providerCustomer.pro_account_mandates,
            contacts: providerCustomer.contacts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
