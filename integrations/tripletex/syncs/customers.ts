import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    customerNumber: z.number().optional(),
    organizationNumber: z.string().optional(),
    isInactive: z.boolean().optional(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    invoiceEmail: z.string().optional(),
    language: z.string().optional(),
    website: z.string().optional()
});

const RawCustomerSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    customerNumber: z.number().optional(),
    organizationNumber: z.string().optional(),
    isInactive: z.boolean().optional(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    invoiceEmail: z.string().optional(),
    language: z.string().optional(),
    website: z.string().optional()
});

const sync = createSync({
    description: 'Sync customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        await nango.trackDeletesStart('Customer');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: '/v2/customer',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const customers = page.map((record: unknown) => {
                const parsed = RawCustomerSchema.safeParse(record);

                if (!parsed.success) {
                    throw new Error(`Failed to parse customer record: ${parsed.error.message}`);
                }

                const raw = parsed.data;

                return {
                    id: String(raw.id),
                    name: raw.name,
                    ...(raw.email != null && { email: raw.email }),
                    ...(raw.phoneNumber != null && { phoneNumber: raw.phoneNumber }),
                    ...(raw.phoneNumberMobile != null && { phoneNumberMobile: raw.phoneNumberMobile }),
                    ...(raw.customerNumber != null && { customerNumber: raw.customerNumber }),
                    ...(raw.organizationNumber != null && { organizationNumber: raw.organizationNumber }),
                    ...(raw.isInactive != null && { isInactive: raw.isInactive }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.displayName != null && { displayName: raw.displayName }),
                    ...(raw.invoiceEmail != null && { invoiceEmail: raw.invoiceEmail }),
                    ...(raw.language != null && { language: raw.language }),
                    ...(raw.website != null && { website: raw.website })
                };
            });

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }
        }

        await nango.trackDeletesEnd('Customer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
