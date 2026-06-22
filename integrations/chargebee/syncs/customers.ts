import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ChargebeeCustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    updated_at: z.number(),
    deleted: z.boolean().optional()
});

const ChargebeeListEntrySchema = z.object({
    customer: ChargebeeCustomerSchema
});

const CustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    updated_at: z.number(),
    deleted: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.number(),
    offset: z.string()
});

const sync = createSync({
    description: 'Sync customers incrementally using updated_at timestamp filter.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const rawUpdatedAfter = checkpoint?.['updated_after'];
        const updatedAfter = typeof rawUpdatedAfter === 'number' && rawUpdatedAfter !== 0 ? rawUpdatedAfter : undefined;
        const isFullRefresh = updatedAfter === undefined;

        let offset: string | undefined = isFullRefresh
            ? undefined
            : typeof checkpoint?.['offset'] === 'string' && checkpoint['offset'] !== ''
              ? checkpoint['offset']
              : undefined;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Customer');
        }

        let lastUpdatedAt: number | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/customers
            endpoint: '/api/v2/customers',
            params: {
                'sort_by[asc]': 'updated_at',
                ...(offset !== undefined && { offset }),
                ...(updatedAfter !== undefined && { 'updated_at[after]': updatedAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' && nextPageParam !== '' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array of customer wrappers');
            }

            const customers = page.map((rawEntry) => {
                const entry = ChargebeeListEntrySchema.parse(rawEntry);
                const record = entry.customer;
                return {
                    id: record.id,
                    ...(record.first_name !== undefined && { first_name: record.first_name }),
                    ...(record.last_name !== undefined && { last_name: record.last_name }),
                    ...(record.email !== undefined && { email: record.email }),
                    ...(record.company !== undefined && { company: record.company }),
                    updated_at: record.updated_at,
                    ...(record.deleted !== undefined && { deleted: record.deleted })
                };
            });

            if (customers.length === 0) {
                continue;
            }

            await nango.batchSave(customers, 'Customer');

            const lastCustomer = customers[customers.length - 1];
            if (lastCustomer !== undefined) {
                lastUpdatedAt = lastCustomer.updated_at;
            }

            if (!isFullRefresh && offset !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    offset
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Customer');
        }

        if (lastUpdatedAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: lastUpdatedAt,
                offset: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
