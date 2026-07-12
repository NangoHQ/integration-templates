import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    country_alpha2: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('Individual customer identifier. Example: "1338479775744"'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
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

const ProviderIndividualCustomerSchema = z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().nullable().optional(),
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
        .nullable()
        .optional(),
    payment_conditions: z.string().optional(),
    billing_iban: z.string().nullable().optional(),
    recipient: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    emails: z.array(z.string()).optional(),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
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
    payment_conditions: z.string().optional(),
    billing_iban: z.string().optional(),
    recipient: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    emails: z.array(z.string()).optional(),
    external_reference: z.string().optional(),
    billing_language: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update an individual customer',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.first_name !== undefined) {
            data['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            data['last_name'] = input.last_name;
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

        const response = await nango.put({
            // https://pennylane.readme.io/reference/putindividualcustomer
            endpoint: `/api/external/v2/individual_customers/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        const providerCustomer = ProviderIndividualCustomerSchema.parse(response.data);

        return {
            id: String(providerCustomer.id),
            ...(providerCustomer.first_name != null && {
                first_name: providerCustomer.first_name
            }),
            ...(providerCustomer.last_name != null && {
                last_name: providerCustomer.last_name
            }),
            ...(providerCustomer.name != null && { name: providerCustomer.name }),
            ...(providerCustomer.phone != null && { phone: providerCustomer.phone }),
            ...(providerCustomer.billing_address != null && {
                billing_address: providerCustomer.billing_address
            }),
            ...(providerCustomer.delivery_address != null && {
                delivery_address: providerCustomer.delivery_address
            }),
            ...(providerCustomer.payment_conditions != null && {
                payment_conditions: providerCustomer.payment_conditions
            }),
            ...(providerCustomer.billing_iban != null && {
                billing_iban: providerCustomer.billing_iban
            }),
            ...(providerCustomer.recipient != null && {
                recipient: providerCustomer.recipient
            }),
            ...(providerCustomer.reference != null && {
                reference: providerCustomer.reference
            }),
            ...(providerCustomer.notes != null && { notes: providerCustomer.notes }),
            ...(providerCustomer.emails != null && { emails: providerCustomer.emails }),
            ...(providerCustomer.external_reference != null && {
                external_reference: providerCustomer.external_reference
            }),
            ...(providerCustomer.billing_language != null && {
                billing_language: providerCustomer.billing_language
            }),
            ...(providerCustomer.created_at != null && {
                created_at: providerCustomer.created_at
            }),
            ...(providerCustomer.updated_at != null && {
                updated_at: providerCustomer.updated_at
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
