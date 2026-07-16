import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string(),
    given_name: z.string().optional().nullable(),
    family_name: z.string().optional().nullable(),
    email_address: z.string().optional().nullable(),
    phone_number: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    address: z
        .object({
            address_line_1: z.string().optional().nullable(),
            address_line_2: z.string().optional().nullable(),
            locality: z.string().optional().nullable(),
            administrative_district_level_1: z.string().optional().nullable(),
            postal_code: z.string().optional().nullable(),
            country: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    preferences: z
        .object({
            email_unsubscribed: z.boolean().optional().nullable()
        })
        .optional()
        .nullable(),
    reference_id: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    creation_source: z.string().optional().nullable(),
    group_ids: z.array(z.string()).optional().nullable(),
    segment_ids: z.array(z.string()).optional().nullable(),
    version: z.number().optional().nullable()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;

        const filter = updatedAfter
            ? {
                  updated_at: {
                      start_at: updatedAfter
                  }
              }
            : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/customers-api/search-customers
            endpoint: '/v2/customers/search',
            method: 'POST',
            data: {
                ...(cursor && { cursor }),
                query: {
                    ...(filter && { filter })
                },
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'customers',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let maxUpdatedAt = updatedAfter;

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(CustomerSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse customers page: ${parsed.error.message}`);
            }

            const customers = parsed.data;
            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');

                for (const customer of customers) {
                    if (!maxUpdatedAt || customer.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = customer.updated_at;
                    }
                }
            }

            if (cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    cursor
                });
            }
        }

        await nango.saveCheckpoint({ updated_after: maxUpdatedAt ?? '', cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
