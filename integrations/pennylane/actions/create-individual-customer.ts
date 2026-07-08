import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address: z.string().describe('Street address. Example: "8 rue de la paix"'),
    postal_code: z.string().describe('Postal code. Example: "75002"'),
    city: z.string().describe('City. Example: "Paris"'),
    country_alpha2: z.string().describe('ISO 3166-1 alpha-2 country code. Example: "FR"')
});

const InputSchema = z.object({
    first_name: z.string().describe('First name of the individual customer. Example: "John"'),
    last_name: z.string().describe('Last name of the individual customer. Example: "Doe"'),
    billing_address: AddressSchema.describe('Billing address of the customer'),
    phone: z.string().optional().describe('Phone number. Example: "+33612345678"'),
    delivery_address: AddressSchema.optional().describe('Delivery address of the customer'),
    payment_conditions: z
        .enum(['upon_receipt', 'custom', '7_days', '15_days', '30_days', '30_days_end_of_month', '45_days', '45_days_end_of_month', '60_days'])
        .optional()
        .describe('Payment conditions. Default is 30_days'),
    billing_iban: z.string().nullable().optional().describe('IBAN for billing. Example: "FR1420041010050500013M02606"'),
    recipient: z.string().optional().describe('Recipient name. Example: "John Doe"'),
    reference: z.string().nullable().optional().describe('Customer reference. Example: "REF-1234"'),
    ledger_account: z
        .object({
            number: z.string()
        })
        .nullable()
        .optional()
        .describe('Ledger account with account number'),
    notes: z.string().nullable().optional().describe('Notes about the customer'),
    emails: z.array(z.string()).optional().describe('List of email addresses'),
    external_reference: z.string().optional().describe('Unique external reference. Example: "0e67fc3c-c632-4feb-ad34-e18ed5fbf66a"'),
    billing_language: z.enum(['fr_FR', 'en_GB', 'de_DE']).optional().describe('Language for billing documents. Default is fr_FR')
});

const ProviderIndividualCustomerSchema = z.object({
    id: z.number().describe('Pennylane customer ID. Example: 42'),
    name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    billing_iban: z.string().nullable(),
    payment_conditions: z
        .enum(['upon_receipt', 'custom', '7_days', '15_days', '30_days', '30_days_end_of_month', '45_days', '45_days_end_of_month', '60_days'])
        .nullable(),
    recipient: z.string().nullable(),
    phone: z.string().nullable(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .nullable(),
    emails: z.array(z.string()).nullable(),
    billing_address: AddressSchema,
    delivery_address: AddressSchema.nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    external_reference: z.string().nullable(),
    billing_language: z.enum(['fr_FR', 'en_GB', 'de_DE']).nullable(),
    mandates: z
        .object({
            url: z.string()
        })
        .nullable(),
    pro_account_mandates: z
        .object({
            url: z.string()
        })
        .nullable(),
    contacts: z
        .object({
            url: z.string()
        })
        .nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    billing_iban: z.string().optional(),
    payment_conditions: z.string().optional(),
    recipient: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    ledger_account: z
        .object({
            id: z.number()
        })
        .optional(),
    emails: z.array(z.string()).optional(),
    billing_address: AddressSchema,
    delivery_address: AddressSchema.optional(),
    created_at: z.string(),
    updated_at: z.string(),
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

const action = createAction({
    description: 'Create an individual customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/postindividualcustomer
            endpoint: '/api/external/v2/individual_customers',
            data: {
                first_name: input.first_name,
                last_name: input.last_name,
                billing_address: input.billing_address,
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.delivery_address !== undefined && { delivery_address: input.delivery_address }),
                ...(input.payment_conditions !== undefined && { payment_conditions: input.payment_conditions }),
                ...(input.billing_iban !== undefined && { billing_iban: input.billing_iban }),
                ...(input.recipient !== undefined && { recipient: input.recipient }),
                ...(input.reference !== undefined && { reference: input.reference }),
                ...(input.ledger_account !== undefined && { ledger_account: input.ledger_account }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.emails !== undefined && { emails: input.emails }),
                ...(input.external_reference !== undefined && { external_reference: input.external_reference }),
                ...(input.billing_language !== undefined && { billing_language: input.billing_language })
            },
            retries: 1
        });

        const customer = ProviderIndividualCustomerSchema.parse(response.data);

        return {
            id: customer.id,
            name: customer.name,
            first_name: customer.first_name,
            last_name: customer.last_name,
            ...(customer.billing_iban != null && { billing_iban: customer.billing_iban }),
            ...(customer.payment_conditions != null && { payment_conditions: customer.payment_conditions }),
            ...(customer.recipient != null && { recipient: customer.recipient }),
            ...(customer.phone != null && { phone: customer.phone }),
            ...(customer.reference != null && { reference: customer.reference }),
            ...(customer.notes != null && { notes: customer.notes }),
            ...(customer.ledger_account != null && { ledger_account: customer.ledger_account }),
            ...(customer.emails != null && { emails: customer.emails }),
            billing_address: customer.billing_address,
            ...(customer.delivery_address != null && { delivery_address: customer.delivery_address }),
            created_at: customer.created_at,
            updated_at: customer.updated_at,
            ...(customer.external_reference != null && { external_reference: customer.external_reference }),
            ...(customer.billing_language != null && { billing_language: customer.billing_language }),
            ...(customer.mandates != null && { mandates: customer.mandates }),
            ...(customer.pro_account_mandates != null && { pro_account_mandates: customer.pro_account_mandates }),
            ...(customer.contacts != null && { contacts: customer.contacts })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
