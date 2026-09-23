import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmailMarketingConsentSchema = z
    .object({
        state: z.union([z.string(), z.number()]).optional().describe('The current email marketing consent state, e.g. subscribed or unsubscribed'),
        opt_in_level: z.union([z.string(), z.number()]).optional().describe('The opt-in level for email marketing consent'),
        consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when the email marketing consent was last updated')
    })
    .describe('Email marketing consent settings for a customer');

const SmsMarketingConsentSchema = z
    .object({
        state: z.union([z.string(), z.number()]).optional().describe('The current SMS marketing consent state, e.g. subscribed or unsubscribed'),
        opt_in_level: z.union([z.string(), z.number()]).optional().describe('The opt-in level for SMS marketing consent'),
        consent_updated_at: z.string().optional().describe('ISO 8601 timestamp when the SMS marketing consent was last updated')
    })
    .describe('SMS marketing consent settings for a customer');

const AddressSchema = z
    .object({
        id: z.string().describe('Unique identifier for the address'),
        customer_id: z.string().nullable().optional().describe('The customer ID this address belongs to'),
        first_name: z.string().nullable().optional().describe('First name on the address'),
        last_name: z.string().nullable().optional().describe('Last name on the address'),
        company: z.string().nullable().optional().describe('Company name on the address'),
        address1: z.string().nullable().optional().describe('First line of the street address'),
        address2: z.string().nullable().optional().describe('Second line of the street address'),
        city: z.string().nullable().optional().describe('City name'),
        province: z.string().nullable().optional().describe('Province or state name'),
        country: z.string().nullable().optional().describe('Country name'),
        zip: z.string().nullable().optional().describe('Postal or ZIP code'),
        phone: z.string().nullable().optional().describe('Phone number associated with the address'),
        name: z.string().nullable().optional().describe('Full name on the address'),
        province_code: z.string().nullable().optional().describe('ISO code for the province or state'),
        country_code: z.string().nullable().optional().describe('ISO code for the country'),
        country_name: z.string().nullable().optional().describe('Full country name'),
        default: z.boolean().optional().describe('Whether this is the default address for the customer')
    })
    .describe('A customer address record');

const CustomerSchema = z
    .object({
        id: z.string().describe('Unique identifier for the customer'),
        email: z.string().nullable().optional().describe('Customer email address'),
        created_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the customer was created'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the customer was last updated'),
        first_name: z.string().nullable().optional().describe('Customer first name'),
        last_name: z.string().nullable().optional().describe('Customer last name'),
        orders_count: z.number().int().optional().describe('Total number of orders placed by this customer'),
        state: z.string().nullable().optional().describe('Customer account state, e.g. enabled or disabled'),
        total_spent: z.string().nullable().optional().describe('Total amount spent by the customer'),
        last_order_id: z.string().nullable().optional().describe('ID of the customers last order'),
        note: z.string().nullable().optional().describe('A note about the customer'),
        verified_email: z.boolean().optional().describe('Whether the customer has verified their email address'),
        multipass_identifier: z.string().nullable().optional().describe('Unique identifier from a multipass login'),
        tax_exempt: z.boolean().optional().describe('Whether the customer is exempt from taxes'),
        phone: z.string().nullable().optional().describe('Customer phone number'),
        tags: z.string().nullable().optional().describe('Comma-separated list of tags associated with the customer'),
        last_order_name: z.string().nullable().optional().describe('Name of the customers last order'),
        currency: z.string().nullable().optional().describe('Currency used by the customer'),
        addresses: z.array(AddressSchema).optional().describe('List of addresses associated with the customer'),
        default_address: AddressSchema.optional().describe('The customers default address'),
        email_marketing_consent: EmailMarketingConsentSchema.optional().describe('Email marketing consent settings for the customer'),
        sms_marketing_consent: SmsMarketingConsentSchema.optional().describe('SMS marketing consent settings for the customer')
    })
    .describe('A SHOPLINE customer record with embedded addresses and marketing consent');

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page_info: z.string()
});

const sync = createSync({
    description: 'Sync customers, including embedded addresses and marketing consent',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint || { updated_after: '', page_info: '' });
        if (!parsedCheckpoint.success) {
            throw new Error('Invalid checkpoint: ' + parsedCheckpoint.error.message);
        }

        let updatedAfter = parsedCheckpoint.data.updated_after || undefined;
        const isFullRefresh = updatedAfter === undefined;
        let pageInfo = isFullRefresh ? undefined : parsedCheckpoint.data.page_info || undefined;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Customer');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer/customer
            endpoint: '/admin/openapi/v20260601/v2/customers.json',
            params: {
                ...(updatedAfter && { updated_at_min: updatedAfter }),
                ...(pageInfo && { page_info: pageInfo }),
                limit: 100
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'customers',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async (paginationState) => {
                    const nextPageParam = paginationState.nextPageParam;
                    if (typeof nextPageParam === 'string') {
                        const url = new URL(nextPageParam);
                        pageInfo = url.searchParams.get('page_info') || undefined;
                    } else {
                        pageInfo = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const customers = [];
            for (const item of page) {
                if (item === null || typeof item !== 'object') {
                    throw new Error('Expected customer item to be an object');
                }
                if (!item.id || typeof item.id !== 'string') {
                    throw new Error('Customer record missing id');
                }

                const customer = {
                    id: item.id,
                    ...(item.email != null && typeof item.email === 'string' && { email: item.email }),
                    ...(item.created_at != null && typeof item.created_at === 'string' && { created_at: item.created_at }),
                    ...(item.updated_at != null && typeof item.updated_at === 'string' && { updated_at: item.updated_at }),
                    ...(item.first_name != null && typeof item.first_name === 'string' && { first_name: item.first_name }),
                    ...(item.last_name != null && typeof item.last_name === 'string' && { last_name: item.last_name }),
                    ...(item.orders_count != null && typeof item.orders_count === 'number' && { orders_count: item.orders_count }),
                    ...(item.state != null && typeof item.state === 'string' && { state: item.state }),
                    ...(item.total_spent != null && typeof item.total_spent === 'string' && { total_spent: item.total_spent }),
                    ...(item.last_order_id != null && typeof item.last_order_id === 'string' && { last_order_id: item.last_order_id }),
                    ...(item.note != null && typeof item.note === 'string' && { note: item.note }),
                    ...(item.verified_email != null && typeof item.verified_email === 'boolean' && { verified_email: item.verified_email }),
                    ...(item.multipass_identifier != null &&
                        typeof item.multipass_identifier === 'string' && { multipass_identifier: item.multipass_identifier }),
                    ...(item.tax_exempt != null && typeof item.tax_exempt === 'boolean' && { tax_exempt: item.tax_exempt }),
                    ...(item.phone != null && typeof item.phone === 'string' && { phone: item.phone }),
                    ...(item.tags != null && typeof item.tags === 'string' && { tags: item.tags }),
                    ...(item.last_order_name != null && typeof item.last_order_name === 'string' && { last_order_name: item.last_order_name }),
                    ...(item.currency != null && typeof item.currency === 'string' && { currency: item.currency }),
                    ...(item.addresses != null && Array.isArray(item.addresses) && { addresses: item.addresses }),
                    ...(item.default_address != null && typeof item.default_address === 'object' && { default_address: item.default_address }),
                    ...(item.email_marketing_consent != null &&
                        typeof item.email_marketing_consent === 'object' && { email_marketing_consent: item.email_marketing_consent }),
                    ...(item.sms_marketing_consent != null &&
                        typeof item.sms_marketing_consent === 'object' && { sms_marketing_consent: item.sms_marketing_consent })
                };

                const parsed = CustomerSchema.safeParse(customer);
                if (!parsed.success) {
                    throw new Error('Invalid customer record: ' + parsed.error.message);
                }
                customers.push(parsed.data);
            }

            if (customers.length === 0) {
                continue;
            }

            await nango.batchSave(customers, 'Customer');

            if (pageInfo !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page_info: pageInfo
                });
            } else {
                const lastCustomer = customers[customers.length - 1];
                if (lastCustomer && typeof lastCustomer === 'object' && 'updated_at' in lastCustomer && typeof lastCustomer.updated_at === 'string') {
                    updatedAfter = lastCustomer.updated_at;
                    await nango.saveCheckpoint({ updated_after: updatedAfter, page_info: '' });
                }
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
