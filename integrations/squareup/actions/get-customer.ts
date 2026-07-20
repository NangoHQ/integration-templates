import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('Square customer ID. Example: "D0W2WW574N4NKXWH7ZATYCF1J0"')
});

const AddressSchema = z
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
    .passthrough();

const TaxIdsSchema = z
    .object({
        eu_vat: z.string().nullable().optional()
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        given_name: z.string().nullable().optional(),
        family_name: z.string().nullable().optional(),
        nickname: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        email_address: z.string().nullable().optional(),
        phone_number: z.string().nullable().optional(),
        birthday: z.string().nullable().optional(),
        address: AddressSchema.nullable().optional(),
        note: z.string().nullable().optional(),
        preferences: z.record(z.string(), z.unknown()).nullable().optional(),
        creation_source: z.string().optional(),
        segment_ids: z.array(z.string()).nullable().optional(),
        version: z.number().optional(),
        tax_ids: TaxIdsSchema.nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        given_name: z.string().nullable().optional(),
        family_name: z.string().nullable().optional(),
        nickname: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        email_address: z.string().nullable().optional(),
        phone_number: z.string().nullable().optional(),
        birthday: z.string().nullable().optional(),
        address: AddressSchema.nullable().optional(),
        note: z.string().nullable().optional(),
        preferences: z.record(z.string(), z.unknown()).nullable().optional(),
        creation_source: z.string().optional(),
        segment_ids: z.array(z.string()).nullable().optional(),
        version: z.number().optional(),
        tax_ids: TaxIdsSchema.nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/customers-api/get-customer
            endpoint: `/v2/customers/${encodeURIComponent(input.customer_id)}`,
            retries: 3
        });

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Response data is not an object',
                customer_id: input.customer_id
            });
        }

        if (!('customer' in response.data) || typeof response.data.customer !== 'object' || response.data.customer === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Response missing customer object',
                customer_id: input.customer_id
            });
        }

        const customer = CustomerSchema.parse(response.data.customer);

        return {
            id: customer.id,
            ...(customer.created_at !== undefined && { created_at: customer.created_at }),
            ...(customer.updated_at !== undefined && { updated_at: customer.updated_at }),
            ...(customer.given_name !== undefined && { given_name: customer.given_name }),
            ...(customer.family_name !== undefined && { family_name: customer.family_name }),
            ...(customer.nickname !== undefined && { nickname: customer.nickname }),
            ...(customer.company_name !== undefined && { company_name: customer.company_name }),
            ...(customer.email_address !== undefined && { email_address: customer.email_address }),
            ...(customer.phone_number !== undefined && { phone_number: customer.phone_number }),
            ...(customer.birthday !== undefined && { birthday: customer.birthday }),
            ...(customer.address !== undefined && { address: customer.address }),
            ...(customer.note !== undefined && { note: customer.note }),
            ...(customer.preferences !== undefined && { preferences: customer.preferences }),
            ...(customer.creation_source !== undefined && { creation_source: customer.creation_source }),
            ...(customer.segment_ids !== undefined && { segment_ids: customer.segment_ids }),
            ...(customer.version !== undefined && { version: customer.version }),
            ...(customer.tax_ids !== undefined && { tax_ids: customer.tax_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
