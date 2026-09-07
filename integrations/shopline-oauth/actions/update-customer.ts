import { z } from 'zod';
import { createAction } from 'nango';

const CustomerAddressInputSchema = z.object({
    first_name: z.string().optional().describe('First name of the address recipient.'),
    last_name: z.string().optional().describe('Last name of the address recipient.'),
    company: z.string().optional().describe('Company name associated with the address.'),
    address1: z.string().optional().describe('Street address line 1.'),
    address2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    country: z.string().optional().describe('Country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    name: z.string().optional().describe('Full name of the address recipient.'),
    province_code: z.string().optional().describe('Province or state code.'),
    country_code: z.string().optional().describe('ISO country code.'),
    country_name: z.string().optional().describe('Full country name.'),
    default: z.boolean().optional().describe('Whether this is the default address.')
});

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the customer to update. Example: "2791641345"'),
        first_name: z.string().optional().describe('Customer first name.'),
        last_name: z.string().optional().describe('Customer last name.'),
        email: z.string().optional().describe('Customer email address.'),
        phone: z.string().optional().describe('Customer phone number.'),
        birthday: z.string().optional().describe('Customer birthday in ISO 8601 format.'),
        gender: z.string().optional().describe('Customer gender.'),
        note: z.string().optional().describe('Additional notes about the customer.'),
        tags: z.string().optional().describe('Comma-separated tags for the customer.'),
        verified_email: z.boolean().optional().describe('Whether the customer email is verified.'),
        email_marketing_consent: z
            .object({
                state: z.string().optional().describe('Consent state for email marketing.'),
                opt_in_level: z.string().optional().describe('Opt-in level for email marketing.'),
                consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when consent was last updated.')
            })
            .optional()
            .describe('Email marketing consent settings.'),
        sms_marketing_consent: z
            .object({
                state: z.string().optional().describe('Consent state for SMS marketing.'),
                opt_in_level: z.string().optional().describe('Opt-in level for SMS marketing.'),
                consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when consent was last updated.')
            })
            .optional()
            .describe('SMS marketing consent settings.'),
        addresses: z.array(CustomerAddressInputSchema).optional().describe('List of customer addresses.')
    })
    .describe('Input parameters for updating a customer.');

const CustomerAddressOutputSchema = z.object({
    id: z.coerce.string().optional().describe('Unique identifier of the address.'),
    customer_id: z.coerce.string().optional().describe('Customer ID associated with the address.'),
    first_name: z.string().optional().describe('First name of the address recipient.'),
    last_name: z.string().optional().describe('Last name of the address recipient.'),
    company: z.string().optional().describe('Company name.'),
    address1: z.string().optional().describe('Street address line 1.'),
    address2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    country: z.string().optional().describe('Country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    name: z.string().optional().describe('Full name of the address recipient.'),
    province_code: z.string().optional().describe('Province or state code.'),
    country_code: z.string().optional().describe('ISO country code.'),
    country_name: z.string().optional().describe('Full country name.'),
    default: z.boolean().optional().describe('Whether this is the default address.')
});

const OutputSchema = z
    .object({
        id: z.coerce.string().describe('Unique identifier of the customer.'),
        first_name: z.string().optional().describe('Customer first name.'),
        last_name: z.string().optional().describe('Customer last name.'),
        email: z.string().optional().describe('Customer email address.'),
        phone: z.string().optional().describe('Customer phone number.'),
        birthday: z.string().optional().describe('Customer birthday in ISO 8601 format.'),
        gender: z.string().optional().describe('Customer gender.'),
        note: z.string().optional().describe('Additional notes about the customer.'),
        tags: z.string().optional().describe('Comma-separated tags for the customer.'),
        verified_email: z.boolean().optional().describe('Whether the customer email is verified.'),
        email_marketing_consent: z
            .object({
                state: z.coerce.string().optional().describe('Consent state for email marketing.'),
                opt_in_level: z.coerce.string().optional().describe('Opt-in level for email marketing.'),
                consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when consent was last updated.')
            })
            .optional()
            .describe('Email marketing consent settings.'),
        sms_marketing_consent: z
            .object({
                state: z.coerce.string().optional().describe('Consent state for SMS marketing.'),
                opt_in_level: z.coerce.string().optional().describe('Opt-in level for SMS marketing.'),
                consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when consent was last updated.')
            })
            .optional()
            .describe('SMS marketing consent settings.'),
        addresses: z.array(CustomerAddressOutputSchema).optional().describe('List of customer addresses.')
    })
    .describe('The updated customer object.');

function removeNulls(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(removeNulls).filter((item) => item !== undefined);
    }
    if (typeof value === 'object' && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const cleaned = removeNulls(val);
            if (cleaned !== undefined) {
                result[key] = cleaned;
            }
        }
        return result;
    }
    return value;
}

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to update an existing customer record.
 */
const action = createAction({
    description: "Update a customer's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const customerBody: Record<string, unknown> = {};
        if (input.first_name !== undefined) {
            customerBody['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            customerBody['last_name'] = input.last_name;
        }
        if (input.email !== undefined) {
            customerBody['email'] = input.email;
        }
        if (input.phone !== undefined) {
            customerBody['phone'] = input.phone;
        }
        if (input.birthday !== undefined) {
            customerBody['birthday'] = input.birthday;
        }
        if (input.gender !== undefined) {
            customerBody['gender'] = input.gender;
        }
        if (input.note !== undefined) {
            customerBody['note'] = input.note;
        }
        if (input.tags !== undefined) {
            customerBody['tags'] = input.tags;
        }
        if (input.verified_email !== undefined) {
            customerBody['verified_email'] = input.verified_email;
        }
        if (input.email_marketing_consent !== undefined) {
            customerBody['email_marketing_consent'] = input.email_marketing_consent;
        }
        if (input.sms_marketing_consent !== undefined) {
            customerBody['sms_marketing_consent'] = input.sms_marketing_consent;
        }
        if (input.addresses !== undefined) {
            customerBody['addresses'] = input.addresses;
        }

        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer-information/update-a-customer
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.id)}.json`,
            data: {
                customer: customerBody
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                customer: z.object({}).passthrough()
            })
            .parse(response.data);

        const cleanedCustomer = removeNulls(providerResponse.customer);
        const customer = OutputSchema.parse(cleanedCustomer);

        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
