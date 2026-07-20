import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('The ID of the customer to update. Example: "D0W2WW574N4NKXWH7ZATYCF1J0"'),
    given_name: z.string().max(300).optional().describe('The given name (first name) associated with the customer profile.'),
    family_name: z.string().max(300).optional().describe('The family name (last name) associated with the customer profile.'),
    company_name: z.string().max(500).optional().describe('A business name associated with the customer profile.'),
    nickname: z.string().max(100).optional().describe('A nickname for the customer profile.'),
    email_address: z.string().max(254).optional().describe('The email address associated with the customer profile.'),
    address: z
        .object({
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
        })
        .optional()
        .describe('The physical address associated with the customer profile.'),
    phone_number: z.string().optional().describe('The phone number associated with the customer profile. Must be a valid E.164 number (e.g. +14155552671).'),
    reference_id: z.string().max(100).optional().describe('An optional second ID used to associate the customer profile with an entity in another system.'),
    note: z.string().optional().describe('A custom note associated with the customer profile.'),
    birthday: z.string().optional().describe('The birthday associated with the customer profile, in YYYY-MM-DD or MM-DD format.'),
    version: z.number().optional().describe('The current version of the customer profile for optimistic concurrency control.')
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    email_address: z.string().nullable().optional(),
    address: z
        .object({
            address_line_1: z.string().nullable().optional(),
            address_line_2: z.string().nullable().optional(),
            address_line_3: z.string().nullable().optional(),
            locality: z.string().nullable().optional(),
            sublocality: z.string().nullable().optional(),
            sublocality_2: z.string().nullable().optional(),
            sublocality_3: z.string().nullable().optional(),
            administrative_district_level_1: z.string().nullable().optional(),
            administrative_district_level_2: z.string().nullable().optional(),
            administrative_district_level_3: z.string().nullable().optional(),
            postal_code: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    phone_number: z.string().nullable().optional(),
    reference_id: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    birthday: z.string().nullable().optional(),
    version: z.number().optional(),
    preferences: z
        .object({
            email_unsubscribed: z.boolean().optional()
        })
        .nullable()
        .optional(),
    creation_source: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    segment_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    company_name: z.string().optional(),
    nickname: z.string().optional(),
    email_address: z.string().optional(),
    address: z
        .object({
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
        })
        .optional(),
    phone_number: z.string().optional(),
    reference_id: z.string().optional(),
    note: z.string().optional(),
    birthday: z.string().optional(),
    version: z.number().optional(),
    preferences: z
        .object({
            email_unsubscribed: z.boolean().optional()
        })
        .optional(),
    creation_source: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    segment_ids: z.array(z.string()).optional()
});

function buildUpdateBody(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (input.given_name !== undefined) {
        body['given_name'] = input.given_name;
    }
    if (input.family_name !== undefined) {
        body['family_name'] = input.family_name;
    }
    if (input.company_name !== undefined) {
        body['company_name'] = input.company_name;
    }
    if (input.nickname !== undefined) {
        body['nickname'] = input.nickname;
    }
    if (input.email_address !== undefined) {
        body['email_address'] = input.email_address;
    }
    if (input.address !== undefined) {
        body['address'] = input.address;
    }
    if (input.phone_number !== undefined) {
        body['phone_number'] = input.phone_number;
    }
    if (input.reference_id !== undefined) {
        body['reference_id'] = input.reference_id;
    }
    if (input.note !== undefined) {
        body['note'] = input.note;
    }
    if (input.birthday !== undefined) {
        body['birthday'] = input.birthday;
    }
    if (input.version !== undefined) {
        body['version'] = input.version;
    }

    return body;
}

function normalizeAddress(address: z.infer<typeof ProviderCustomerSchema>['address']) {
    if (!address) {
        return undefined;
    }

    return {
        ...(address.address_line_1 != null && { address_line_1: address.address_line_1 }),
        ...(address.address_line_2 != null && { address_line_2: address.address_line_2 }),
        ...(address.address_line_3 != null && { address_line_3: address.address_line_3 }),
        ...(address.locality != null && { locality: address.locality }),
        ...(address.sublocality != null && { sublocality: address.sublocality }),
        ...(address.sublocality_2 != null && { sublocality_2: address.sublocality_2 }),
        ...(address.sublocality_3 != null && { sublocality_3: address.sublocality_3 }),
        ...(address.administrative_district_level_1 != null && { administrative_district_level_1: address.administrative_district_level_1 }),
        ...(address.administrative_district_level_2 != null && { administrative_district_level_2: address.administrative_district_level_2 }),
        ...(address.administrative_district_level_3 != null && { administrative_district_level_3: address.administrative_district_level_3 }),
        ...(address.postal_code != null && { postal_code: address.postal_code }),
        ...(address.country != null && { country: address.country }),
        ...(address.first_name != null && { first_name: address.first_name }),
        ...(address.last_name != null && { last_name: address.last_name })
    };
}

const RawResponseSchema = z.object({
    errors: z
        .array(
            z.object({
                code: z.string().optional(),
                detail: z.string().optional()
            })
        )
        .optional(),
    customer: z.unknown().optional()
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.squareup.com/reference/square/customers-api/update-customer
            endpoint: `/v2/customers/${encodeURIComponent(input.customer_id)}`,
            data: buildUpdateBody(input),
            retries: 3
        });

        const rawResponse = RawResponseSchema.parse(response.data);

        if (rawResponse.errors && rawResponse.errors.length > 0) {
            const firstError = rawResponse.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.detail || firstError?.code || 'Square API error',
                errors: rawResponse.errors
            });
        }

        const providerCustomer = ProviderCustomerSchema.parse(rawResponse.customer);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.created_at != null && { created_at: providerCustomer.created_at }),
            ...(providerCustomer.updated_at != null && { updated_at: providerCustomer.updated_at }),
            ...(providerCustomer.given_name != null && { given_name: providerCustomer.given_name }),
            ...(providerCustomer.family_name != null && { family_name: providerCustomer.family_name }),
            ...(providerCustomer.company_name != null && { company_name: providerCustomer.company_name }),
            ...(providerCustomer.nickname != null && { nickname: providerCustomer.nickname }),
            ...(providerCustomer.email_address != null && { email_address: providerCustomer.email_address }),
            ...(providerCustomer.address != null && { address: normalizeAddress(providerCustomer.address) }),
            ...(providerCustomer.phone_number != null && { phone_number: providerCustomer.phone_number }),
            ...(providerCustomer.reference_id != null && { reference_id: providerCustomer.reference_id }),
            ...(providerCustomer.note != null && { note: providerCustomer.note }),
            ...(providerCustomer.birthday != null && { birthday: providerCustomer.birthday }),
            ...(providerCustomer.version != null && { version: providerCustomer.version }),
            ...(providerCustomer.preferences != null && {
                preferences: {
                    ...(providerCustomer.preferences.email_unsubscribed != null && { email_unsubscribed: providerCustomer.preferences.email_unsubscribed })
                }
            }),
            ...(providerCustomer.creation_source != null && { creation_source: providerCustomer.creation_source }),
            ...(providerCustomer.group_ids != null && { group_ids: providerCustomer.group_ids }),
            ...(providerCustomer.segment_ids != null && { segment_ids: providerCustomer.segment_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
