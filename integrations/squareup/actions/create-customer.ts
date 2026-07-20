import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    address_line_3: z.string().optional(),
    locality: z.string().optional(),
    sublocality: z.string().optional(),
    sublocality_2: z.string().optional(),
    sublocality_3: z.string().optional(),
    administrative_district_level_1: z.string().optional(),
    administrative_district_level_2: z.string().optional(),
    administrative_district_level_3: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
});

const InputSchema = z.object({
    given_name: z.string().optional().describe('The given name (first name) associated with the customer profile.'),
    family_name: z.string().optional().describe('The family name (last name) associated with the customer profile.'),
    company_name: z.string().optional().describe('A business name associated with the customer profile.'),
    nickname: z.string().optional().describe('A nickname for the customer profile.'),
    email_address: z.string().optional().describe('The email address associated with the customer profile.'),
    address: AddressSchema.optional().describe('The physical address associated with the customer profile.'),
    phone_number: z.string().optional().describe('The phone number associated with the customer profile. Must be a valid E.164 number.'),
    reference_id: z.string().optional().describe('An optional second ID used to associate the customer profile with an entity in another system.'),
    note: z.string().optional().describe('A custom note associated with the customer profile.'),
    birthday: z.string().optional().describe('The birthday associated with the customer profile, in YYYY-MM-DD or MM-DD format.'),
    idempotency_key: z
        .string()
        .optional()
        .describe('A unique idempotency key. If omitted, a random UUID is generated so retries never create duplicate customers.')
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    given_name: z.string().optional().nullable(),
    family_name: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    nickname: z.string().optional().nullable(),
    email_address: z.string().optional().nullable(),
    address: AddressSchema.optional().nullable(),
    phone_number: z.string().optional().nullable(),
    reference_id: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    preferences: z
        .object({
            email_unsubscribed: z.boolean().optional().nullable()
        })
        .optional()
        .nullable(),
    creation_source: z.string().optional().nullable(),
    version: z.number().optional().nullable()
});

const ProviderResponseSchema = z.object({
    errors: z
        .array(
            z.object({
                code: z.string().optional(),
                detail: z.string().optional()
            })
        )
        .optional(),
    customer: ProviderCustomerSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    company_name: z.string().optional(),
    nickname: z.string().optional(),
    email_address: z.string().optional(),
    address: AddressSchema.optional(),
    phone_number: z.string().optional(),
    reference_id: z.string().optional(),
    note: z.string().optional(),
    birthday: z.string().optional(),
    preferences: z
        .object({
            email_unsubscribed: z.boolean().optional()
        })
        .optional(),
    creation_source: z.string().optional(),
    version: z.number().optional()
});

const action = createAction({
    description: 'Create a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Always send an idempotency key so the automatic retries (below) can never create
        // a duplicate customer if a transport failure/timeout happens after Square already
        // created one. Callers can supply their own; otherwise one is generated per call.
        const idempotencyKey = input.idempotency_key ?? randomUUID();

        const body: Record<string, unknown> = {
            idempotency_key: idempotencyKey,
            ...(input.given_name !== undefined && { given_name: input.given_name }),
            ...(input.family_name !== undefined && { family_name: input.family_name }),
            ...(input.company_name !== undefined && { company_name: input.company_name }),
            ...(input.nickname !== undefined && { nickname: input.nickname }),
            ...(input.email_address !== undefined && { email_address: input.email_address }),
            ...(input.address !== undefined && { address: input.address }),
            ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
            ...(input.reference_id !== undefined && { reference_id: input.reference_id }),
            ...(input.note !== undefined && { note: input.note }),
            ...(input.birthday !== undefined && { birthday: input.birthday })
        };

        const response = await nango.post({
            // https://developer.squareup.com/reference/square/customers-api/create-customer
            endpoint: '/v2/customers',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.detail || firstError?.code || 'Square API error',
                errors: providerResponse.errors
            });
        }

        const customer = ProviderCustomerSchema.parse(providerResponse.customer);

        return {
            id: customer.id,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
            ...(customer.given_name != null && { given_name: customer.given_name }),
            ...(customer.family_name != null && { family_name: customer.family_name }),
            ...(customer.company_name != null && { company_name: customer.company_name }),
            ...(customer.nickname != null && { nickname: customer.nickname }),
            ...(customer.email_address != null && { email_address: customer.email_address }),
            ...(customer.address != null && { address: customer.address }),
            ...(customer.phone_number != null && { phone_number: customer.phone_number }),
            ...(customer.reference_id != null && { reference_id: customer.reference_id }),
            ...(customer.note != null && { note: customer.note }),
            ...(customer.birthday != null && { birthday: customer.birthday }),
            ...(customer.preferences != null && {
                preferences: {
                    ...(customer.preferences.email_unsubscribed != null && { email_unsubscribed: customer.preferences.email_unsubscribed })
                }
            }),
            ...(customer.creation_source != null && { creation_source: customer.creation_source }),
            ...(customer.version != null && { version: customer.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
