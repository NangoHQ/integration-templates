import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Customer ID. Example: "1338468995072"')
});

const AddressSchema = z.object({
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country_alpha2: z.string()
});

const LedgerAccountSchema = z.object({
    id: z.number()
});

const UrlResourceSchema = z.object({
    url: z.string()
});

const CompanyCustomerSchema = z.object({
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
    ledger_account: LedgerAccountSchema.nullable(),
    emails: z.array(z.string()),
    billing_address: AddressSchema.nullable().optional(),
    delivery_address: AddressSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    customer_type: z.literal('company'),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    mandates: UrlResourceSchema.optional(),
    pro_account_mandates: UrlResourceSchema.optional(),
    contacts: UrlResourceSchema.optional()
});

const IndividualCustomerSchema = z.object({
    id: z.number(),
    name: z.string(),
    billing_iban: z.string().nullable(),
    payment_conditions: z.string().optional(),
    recipient: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    ledger_account: LedgerAccountSchema.nullable(),
    emails: z.array(z.string()),
    billing_address: AddressSchema.nullable().optional(),
    delivery_address: AddressSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    customer_type: z.literal('individual'),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    mandates: UrlResourceSchema.optional(),
    pro_account_mandates: UrlResourceSchema.optional(),
    contacts: UrlResourceSchema.optional()
});

const ProviderCustomerSchema = z.union([CompanyCustomerSchema, IndividualCustomerSchema]);

const OutputSchema = ProviderCustomerSchema;

const action = createAction({
    description: 'Retrieve a customer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomer
            endpoint: `/api/external/v2/customers/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found or invalid response received.',
                id: input.id
            });
        }

        const customer = ProviderCustomerSchema.parse(response.data);
        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
