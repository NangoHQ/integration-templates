import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Individual customer ID. Example: "1338479775744"')
});

const ProviderAddressSchema = z.object({
    address: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country_alpha2: z.string().optional().nullable()
});

const ProviderIndividualCustomerSchema = z.object({
    id: z.union([z.string(), z.number()]),
    source_id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    emails: z.array(z.string()).optional().nullable(),
    phone: z.string().optional().nullable(),
    recipient: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    vat_number: z.string().optional().nullable(),
    currency: z.string().optional().nullable(),
    billing_language: z.string().optional().nullable(),
    payment_conditions: z.string().optional().nullable(),
    billing_iban: z.string().optional().nullable(),
    external_reference: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    billing_address: ProviderAddressSchema.optional().nullable(),
    delivery_address: ProviderAddressSchema.optional().nullable(),
    ledger_account: z
        .object({
            id: z.union([z.string(), z.number()]).optional().nullable()
        })
        .optional()
        .nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    source_id: z.string().optional(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    emails: z.array(z.string()).optional(),
    phone: z.string().optional(),
    recipient: z.string().optional(),
    reference: z.string().optional(),
    vat_number: z.string().optional(),
    currency: z.string().optional(),
    billing_language: z.string().optional(),
    payment_conditions: z.string().optional(),
    billing_iban: z.string().optional(),
    external_reference: z.string().optional(),
    notes: z.string().optional(),
    billing_address: z
        .object({
            address: z.string().optional(),
            postal_code: z.string().optional(),
            city: z.string().optional(),
            country_alpha2: z.string().optional()
        })
        .optional(),
    delivery_address: z
        .object({
            address: z.string().optional(),
            postal_code: z.string().optional(),
            city: z.string().optional(),
            country_alpha2: z.string().optional()
        })
        .optional(),
    ledger_account_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an individual customer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/get_individual_customers-id
        const response = await nango.get({
            endpoint: `/individual_customers/${encodeURIComponent(input.id)}`,
            baseUrlOverride: 'https://app.pennylane.com/api/external/v2',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Individual customer not found',
                id: input.id
            });
        }

        const customer = ProviderIndividualCustomerSchema.parse(response.data);

        return {
            id: String(customer.id),
            ...(customer.source_id != null && { source_id: customer.source_id }),
            ...(customer.name != null && { name: customer.name }),
            ...(customer.first_name != null && { first_name: customer.first_name }),
            ...(customer.last_name != null && { last_name: customer.last_name }),
            ...(customer.email != null && { email: customer.email }),
            ...(customer.emails != null && { emails: customer.emails }),
            ...(customer.phone != null && { phone: customer.phone }),
            ...(customer.recipient != null && { recipient: customer.recipient }),
            ...(customer.reference != null && { reference: customer.reference }),
            ...(customer.vat_number != null && { vat_number: customer.vat_number }),
            ...(customer.currency != null && { currency: customer.currency }),
            ...(customer.billing_language != null && { billing_language: customer.billing_language }),
            ...(customer.payment_conditions != null && { payment_conditions: customer.payment_conditions }),
            ...(customer.billing_iban != null && { billing_iban: customer.billing_iban }),
            ...(customer.external_reference != null && { external_reference: customer.external_reference }),
            ...(customer.notes != null && { notes: customer.notes }),
            ...(customer.billing_address != null && {
                billing_address: {
                    ...(customer.billing_address.address != null && { address: customer.billing_address.address }),
                    ...(customer.billing_address.postal_code != null && { postal_code: customer.billing_address.postal_code }),
                    ...(customer.billing_address.city != null && { city: customer.billing_address.city }),
                    ...(customer.billing_address.country_alpha2 != null && { country_alpha2: customer.billing_address.country_alpha2 })
                }
            }),
            ...(customer.delivery_address != null && {
                delivery_address: {
                    ...(customer.delivery_address.address != null && { address: customer.delivery_address.address }),
                    ...(customer.delivery_address.postal_code != null && { postal_code: customer.delivery_address.postal_code }),
                    ...(customer.delivery_address.city != null && { city: customer.delivery_address.city }),
                    ...(customer.delivery_address.country_alpha2 != null && { country_alpha2: customer.delivery_address.country_alpha2 })
                }
            }),
            ...(customer.ledger_account != null && customer.ledger_account.id != null && { ledger_account_id: String(customer.ledger_account.id) }),
            ...(customer.created_at != null && { created_at: customer.created_at }),
            ...(customer.updated_at != null && { updated_at: customer.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
