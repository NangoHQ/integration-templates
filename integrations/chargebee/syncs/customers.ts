import { createSync } from 'nango';
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

const ChargebeeListResponseSchema = z.object({
    list: z.array(ChargebeeListEntrySchema),
    next_offset: z.string().optional()
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
    endpoints: [
        {
            path: '/syncs/customers',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const rawUpdatedAfter = checkpoint?.['updated_after'];
        const updatedAfter = typeof rawUpdatedAfter === 'number' && rawUpdatedAfter !== 0 ? rawUpdatedAfter : undefined;
        const isFullRefresh = updatedAfter === undefined;

        const rawOffset = checkpoint?.['offset'];
        let offset: string | undefined = isFullRefresh ? undefined : typeof rawOffset === 'string' && rawOffset !== '' ? rawOffset : undefined;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Customer');
        }

        let lastUpdatedAt: number | undefined;

        while (true) {
            const response = await nango.get({
                // https://apidocs.chargebee.com/docs/api/customers
                endpoint: '/api/v2/customers',
                params: {
                    sort: 'updated_at[asc]',
                    limit: 100,
                    ...(offset && { offset }),
                    ...(updatedAfter !== undefined && { 'updated_at[gt]': updatedAfter.toString() })
                },
                retries: 3
            });

            if (response.data === undefined) {
                throw new Error('Empty response from Chargebee customers API');
            }

            const parsed = ChargebeeListResponseSchema.parse(response.data);

            const customers = parsed.list.map((entry) => {
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

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
                const lastCustomer = customers[customers.length - 1];
                if (lastCustomer !== undefined) {
                    lastUpdatedAt = lastCustomer.updated_at;
                }
            }

            if (parsed.next_offset === undefined) {
                break;
            }

            offset = parsed.next_offset;

            if (!isFullRefresh) {
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
