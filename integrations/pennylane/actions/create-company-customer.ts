import { z } from 'zod';
import { createAction } from 'nango';

const BillingAddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const InputSchema = z.object({
    name: z.string().describe('Company name. Example: "Acme Corp"'),
    billing_address: BillingAddressSchema.describe('Billing address'),
    vat_number: z.string().optional().describe('VAT number. Example: "FR12345678901"'),
    reg_no: z.string().optional().describe('Registration number. Example: "123456789"'),
    ledger_account: z
        .object({
            number: z.string().describe('Ledger account number. Example: "411100344"')
        })
        .optional()
        .describe('Ledger account to associate with the customer'),
    phone: z.string().optional().describe('Phone number. Example: "+33612345678"'),
    delivery_address: BillingAddressSchema.optional().describe('Delivery address'),
    payment_conditions: z
        .enum(['upon_receipt', 'custom', '7_days', '15_days', '30_days', '30_days_end_of_month', '45_days', '45_days_end_of_month', '60_days'])
        .optional()
        .describe('Payment conditions. Default is 30_days'),
    billing_iban: z.string().nullable().optional().describe('IBAN for billing. Example: "FR1420041010050500013M02606"'),
    recipient: z.string().optional().describe('Name of the person to whom the invoice is addressed. Example: "John Doe"'),
    reference: z.string().nullable().optional().describe('Customer reference. Example: "REF-1234"'),
    notes: z.string().nullable().optional().describe('Notes about the customer. Example: "Some notes"'),
    emails: z.array(z.string()).optional().describe('Email addresses. Example: ["hello@example.org"]'),
    external_reference: z.string().optional().describe('Unique external reference. Example: "0e67fc3c-c632-4feb-ad34-e18ed5fbf66a"'),
    billing_language: z.enum(['fr_FR', 'en_GB', 'de_DE']).optional().describe('Language for invoices. Default is fr_FR')
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
    billing_address: BillingAddressSchema,
    delivery_address: BillingAddressSchema.nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    external_reference: z.string(),
    billing_language: z.string(),
    mandates: z.object({
        url: z.string()
    }),
    pro_account_mandates: z.object({
        url: z.string()
    }),
    contacts: z.object({
        url: z.string()
    })
});

const OutputSchema = z.object({
    id: z.number().describe('Customer ID. Example: 42'),
    name: z.string(),
    billing_iban: z.string().optional(),
    payment_conditions: z.string(),
    recipient: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    vat_number: z.string().optional(),
    reg_no: z.string().optional(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .optional(),
    emails: z.array(z.string()).optional(),
    billing_address: BillingAddressSchema,
    delivery_address: BillingAddressSchema.optional(),
    created_at: z.string(),
    updated_at: z.string(),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    mandates: z.object({
        url: z.string()
    }),
    pro_account_mandates: z.object({
        url: z.string()
    }),
    contacts: z.object({
        url: z.string()
    })
});

const action = createAction({
    description: 'Create a company customer',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/postcompanycustomer
            endpoint: '/api/external/v2/company_customers',
            data: {
                name: input.name,
                billing_address: input.billing_address,
                ...(input.vat_number !== undefined && { vat_number: input.vat_number }),
                ...(input.reg_no !== undefined && { reg_no: input.reg_no }),
                ...(input.ledger_account !== undefined && { ledger_account: input.ledger_account }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.delivery_address !== undefined && { delivery_address: input.delivery_address }),
                ...(input.payment_conditions !== undefined && { payment_conditions: input.payment_conditions }),
                ...(input.billing_iban !== undefined && { billing_iban: input.billing_iban }),
                ...(input.recipient !== undefined && { recipient: input.recipient }),
                ...(input.reference !== undefined && { reference: input.reference }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.emails !== undefined && { emails: input.emails }),
                ...(input.external_reference !== undefined && { external_reference: input.external_reference }),
                ...(input.billing_language !== undefined && { billing_language: input.billing_language })
            },
            retries: 10
        });

        const providerCustomer = ProviderCompanyCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            name: providerCustomer.name,
            ...(providerCustomer.billing_iban != null && { billing_iban: providerCustomer.billing_iban }),
            payment_conditions: providerCustomer.payment_conditions,
            ...(providerCustomer.recipient !== '' && { recipient: providerCustomer.recipient }),
            ...(providerCustomer.phone !== '' && { phone: providerCustomer.phone }),
            ...(providerCustomer.reference != null && { reference: providerCustomer.reference }),
            ...(providerCustomer.notes != null && { notes: providerCustomer.notes }),
            ...(providerCustomer.vat_number !== '' && { vat_number: providerCustomer.vat_number }),
            ...(providerCustomer.reg_no !== '' && { reg_no: providerCustomer.reg_no }),
            ...(providerCustomer.ledger_account != null && { ledger_account: providerCustomer.ledger_account }),
            ...(providerCustomer.emails.length > 0 && { emails: providerCustomer.emails }),
            billing_address: providerCustomer.billing_address,
            ...(providerCustomer.delivery_address != null && { delivery_address: providerCustomer.delivery_address }),
            created_at: providerCustomer.created_at,
            updated_at: providerCustomer.updated_at,
            ...(providerCustomer.external_reference !== '' && { external_reference: providerCustomer.external_reference }),
            ...(providerCustomer.billing_language !== '' && { billing_language: providerCustomer.billing_language }),
            mandates: providerCustomer.mandates,
            pro_account_mandates: providerCustomer.pro_account_mandates,
            contacts: providerCustomer.contacts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
