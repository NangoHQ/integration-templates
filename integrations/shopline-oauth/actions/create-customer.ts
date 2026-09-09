import { z } from 'zod';
import { createAction } from 'nango';

const MarketingConsentInputSchema = z.object({
    consent_collected_from: z.string().optional().describe('Subscription information source. Maximum length: 50.'),
    consent_updated_at: z.string().optional().describe('The date and time when the subscription was updated. Format: ISO 8601.'),
    opt_in_level: z.number().int().min(0).max(2).optional().describe('Subscription method. 0: unknown, 1: single opt-in, 2: confirmed opt-in.'),
    state: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe('Subscription status. 0: Unsubscribed, 1: Subscribed, 2: Not subscribed, 3: Awaiting confirmation.')
});

const AddressInputSchema = z
    .object({
        address1: z.string().optional().describe('Street address or post office box number. Maximum length: 255.'),
        address2: z.string().optional().describe('Apartment, suite, or unit number. Maximum length: 255.'),
        city: z.string().optional().describe('City name. Maximum length: 64.'),
        province: z.string().optional().describe('Province or state name. Maximum length: 64.'),
        province_code: z.string().optional().describe('Code for the province, can be a custom code or a two-digit ISO 3166-2 code.'),
        province_code_v2: z.string().optional().describe('Province code version 2.'),
        country: z.string().optional().describe('Country or region name. Maximum length: 64.'),
        country_code: z.string().optional().describe('Two-letter country code following ISO 3611-1 (alpha 2).'),
        zip: z.string().optional().describe('Postal code. Maximum length: 64.'),
        phone: z.string().optional().describe('Phone number associated with the address. Maximum length: 20.'),
        first_name: z.string().optional().describe('First name for the address. Maximum length: 128.'),
        last_name: z.string().optional().describe('Last name for the address. Maximum length: 128.'),
        company: z.string().optional().describe('Company name. Maximum length: 255.'),
        default: z.boolean().optional().describe('Whether this address is the default address.')
    })
    .passthrough();

const InputSchema = z
    .object({
        email: z.string().optional().describe('Customer email address. Maximum length: 50. At least one of email or phone is required.'),
        phone: z.string().optional().describe('Customer mobile phone number. Maximum length: 20. At least one of email or phone is required.'),
        first_name: z.string().optional().describe('Customer first name. Maximum length: 128.'),
        last_name: z.string().optional().describe('Customer last name. Maximum length: 128.'),
        gender: z.number().int().min(0).max(3).optional().describe('Customer gender. 0: unknown, 1: male, 2: female, 3: secret.'),
        birthday: z.string().optional().describe('Customer birthday in yyyyMMdd format.'),
        note: z.string().optional().describe('Merchant notes on the customer. Maximum length: 1000.'),
        tags: z.string().optional().describe('Tags for the customer, separated by commas. Maximum 100 tags, total length 1000.'),
        addresses: z.array(AddressInputSchema).optional().describe('List of customer addresses. Maximum size: 50.'),
        email_marketing_consent: MarketingConsentInputSchema.optional().describe('Email marketing subscription information.'),
        sms_marketing_consent: MarketingConsentInputSchema.optional().describe('SMS marketing subscription information.')
    })
    .refine((data) => Boolean(data.email || data.phone), {
        message: 'At least one of email or phone is required.'
    })
    .describe('Input parameters for creating a customer.');

const MarketingConsentOutputSchema = z.object({
    consent_collected_from: z.string().optional().describe('Subscription information source.'),
    consent_updated_at: z.string().optional().describe('The date and time when the subscription was updated.'),
    opt_in_level: z.number().optional().describe('Subscription method. 0: unknown, 1: single opt-in, 2: confirmed opt-in.'),
    state: z.number().optional().describe('Subscription status. 0: Unsubscribed, 1: Subscribed, 2: Not subscribed, 3: Awaiting confirmation.')
});

const AddressOutputSchema = z.object({
    id: z.string().optional().describe('Unique identifier for the address.'),
    address1: z.string().optional().describe('Street address or post office box number.'),
    address2: z.string().optional().describe('Apartment, suite, or unit number.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    province_code: z.string().optional().describe('Code for the province.'),
    province_code_v2: z.string().optional().describe('Province code version 2.'),
    country: z.string().optional().describe('Country or region name.'),
    country_code: z.string().optional().describe('Two-letter country code following ISO 3611-1 (alpha 2).'),
    zip: z.string().optional().describe('Postal code.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    first_name: z.string().optional().describe('First name for the address.'),
    last_name: z.string().optional().describe('Last name for the address.'),
    company: z.string().optional().describe('Company name.'),
    default: z.boolean().optional().describe('Whether this address is the default address.'),
    customer_id: z.string().optional().describe('Unique identifier for the customer.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier for the created customer.'),
        email: z.string().optional().describe('Customer email address.'),
        phone: z.string().optional().describe('Customer mobile phone number.'),
        first_name: z.string().optional().describe('Customer first name.'),
        last_name: z.string().optional().describe('Customer last name.'),
        gender: z.string().optional().describe('Customer gender. "others": unknown, "male": male, "female": female, "secret": secret.'),
        birthday: z.string().optional().describe('Customer birthday.'),
        note: z.string().optional().describe('Merchant notes on the customer.'),
        tags: z.string().optional().describe('Tags associated with the customer.'),
        state: z.number().optional().describe('Customer status. 0: Blacklist, 1: Not invited, 2: Invited, 3: Registered.'),
        email_subscribe_flag: z.number().optional().describe('Final email subscription status. 0: Unsubscribed, 1: Subscribed, 2: Not subscribed.'),
        mobile_subscribe_flag: z.number().optional().describe('Final mobile subscription status. 0: Unsubscribed, 1: Subscribed, 2: Not subscribed.'),
        created_at: z.string().optional().describe('The date and time when the customer was created.'),
        updated_at: z.string().optional().describe('The date and time when the customer was last updated.'),
        total_spent: z.string().optional().describe('Total amount spent by the customer.'),
        orders_count: z.number().optional().describe('Number of orders placed by the customer.'),
        default_address: AddressOutputSchema.optional().describe('Default address of the customer.'),
        addresses: z.array(AddressOutputSchema).optional().describe('List of customer addresses.'),
        email_marketing_consent: MarketingConsentOutputSchema.optional().describe('Email marketing subscription information.'),
        sms_marketing_consent: MarketingConsentOutputSchema.optional().describe('SMS marketing subscription information.')
    })
    .describe('Created customer record.');

const ProviderMarketingConsentSchema = z
    .object({
        consent_collected_from: z.string().nullable().optional(),
        consent_updated_at: z.string().nullable().optional(),
        opt_in_level: z.number().nullable().optional(),
        state: z.number().nullable().optional()
    })
    .passthrough();

const ProviderAddressSchema = z
    .object({
        id: z.string().nullable().optional(),
        address1: z.string().nullable().optional(),
        address2: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        province: z.string().nullable().optional(),
        province_code: z.string().nullable().optional(),
        province_code_v2: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        country_code: z.string().nullable().optional(),
        zip: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        default: z.boolean().nullable().optional(),
        customer_id: z.string().nullable().optional()
    })
    .passthrough();

const ProviderCustomerSchema = z
    .object({
        id: z.string(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        gender: z.string().nullable().optional(),
        birthday: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        tags: z.string().nullable().optional(),
        state: z.number().nullable().optional(),
        email_subscribe_flag: z.number().nullable().optional(),
        mobile_subscribe_flag: z.number().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        total_spent: z.string().nullable().optional(),
        orders_count: z.number().nullable().optional(),
        default_address: ProviderAddressSchema.nullable().optional(),
        addresses: z.array(ProviderAddressSchema).nullable().optional(),
        email_marketing_consent: ProviderMarketingConsentSchema.nullable().optional(),
        sms_marketing_consent: ProviderMarketingConsentSchema.nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    customer: ProviderCustomerSchema
});

/**
 * @tags: [write]
 * @tagReason: Creates a new customer record in the SHOPLINE store.
 * @pitfalls: Duplicate emails are rejected with a 422 error.
 */
const action = createAction({
    description: 'Create a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer-information/create-a-customer
            endpoint: '/admin/openapi/v20260601/customers.json',
            data: {
                customer: {
                    ...(input.email !== undefined && { email: input.email }),
                    ...(input.phone !== undefined && { phone: input.phone }),
                    ...(input.first_name !== undefined && { first_name: input.first_name }),
                    ...(input.last_name !== undefined && { last_name: input.last_name }),
                    ...(input.gender !== undefined && { gender: input.gender }),
                    ...(input.birthday !== undefined && { birthday: input.birthday }),
                    ...(input.note !== undefined && { note: input.note }),
                    ...(input.tags !== undefined && { tags: input.tags }),
                    ...(input.addresses !== undefined && { addresses: input.addresses }),
                    ...(input.email_marketing_consent !== undefined && { email_marketing_consent: input.email_marketing_consent }),
                    ...(input.sms_marketing_consent !== undefined && { sms_marketing_consent: input.sms_marketing_consent })
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerCustomer = providerResponse.customer;

        const mapAddress = (addr: z.infer<typeof ProviderAddressSchema>): z.infer<typeof AddressOutputSchema> => ({
            id: addr.id ?? undefined,
            address1: addr.address1 ?? undefined,
            address2: addr.address2 ?? undefined,
            city: addr.city ?? undefined,
            province: addr.province ?? undefined,
            province_code: addr.province_code ?? undefined,
            province_code_v2: addr.province_code_v2 ?? undefined,
            country: addr.country ?? undefined,
            country_code: addr.country_code ?? undefined,
            zip: addr.zip ?? undefined,
            phone: addr.phone ?? undefined,
            first_name: addr.first_name ?? undefined,
            last_name: addr.last_name ?? undefined,
            company: addr.company ?? undefined,
            default: addr.default ?? undefined,
            customer_id: addr.customer_id ?? undefined
        });

        const mapConsent = (
            consent: z.infer<typeof ProviderMarketingConsentSchema> | null | undefined
        ): z.infer<typeof MarketingConsentOutputSchema> | undefined => {
            if (consent === null || consent === undefined) {
                return undefined;
            }
            return {
                consent_collected_from: consent.consent_collected_from ?? undefined,
                consent_updated_at: consent.consent_updated_at ?? undefined,
                opt_in_level: consent.opt_in_level ?? undefined,
                state: consent.state ?? undefined
            };
        };

        return {
            id: providerCustomer.id,
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.phone != null && { phone: providerCustomer.phone }),
            ...(providerCustomer.first_name != null && { first_name: providerCustomer.first_name }),
            ...(providerCustomer.last_name != null && { last_name: providerCustomer.last_name }),
            ...(providerCustomer.gender != null && { gender: providerCustomer.gender }),
            ...(providerCustomer.birthday != null && { birthday: providerCustomer.birthday }),
            ...(providerCustomer.note != null && { note: providerCustomer.note }),
            ...(providerCustomer.tags != null && { tags: providerCustomer.tags }),
            ...(providerCustomer.state != null && { state: providerCustomer.state }),
            ...(providerCustomer.email_subscribe_flag != null && { email_subscribe_flag: providerCustomer.email_subscribe_flag }),
            ...(providerCustomer.mobile_subscribe_flag != null && { mobile_subscribe_flag: providerCustomer.mobile_subscribe_flag }),
            ...(providerCustomer.created_at != null && { created_at: providerCustomer.created_at }),
            ...(providerCustomer.updated_at != null && { updated_at: providerCustomer.updated_at }),
            ...(providerCustomer.total_spent != null && { total_spent: providerCustomer.total_spent }),
            ...(providerCustomer.orders_count != null && { orders_count: providerCustomer.orders_count }),
            ...(providerCustomer.default_address != null && { default_address: mapAddress(providerCustomer.default_address) }),
            ...(providerCustomer.addresses != null && { addresses: providerCustomer.addresses.map(mapAddress) }),
            ...(providerCustomer.email_marketing_consent != null && { email_marketing_consent: mapConsent(providerCustomer.email_marketing_consent) }),
            ...(providerCustomer.sms_marketing_consent != null && { sms_marketing_consent: mapConsent(providerCustomer.sms_marketing_consent) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
