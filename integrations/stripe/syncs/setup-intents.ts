import { createSync } from 'nango';
import { z } from 'zod';

const SetupIntentSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer: z.string().optional(),
    description: z.string().optional(),
    created: z.number(),
    payment_method: z.string().optional(),
    payment_method_types: z.array(z.string()).optional(),
    usage: z.string().optional(),
    cancellation_reason: z.string().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    created_after: z.number(),
    starting_after: z.string()
});

const SetupIntentApiSchema = z.object({
    id: z.string(),
    object: z.string(),
    status: z.string(),
    customer: z.string().nullable(),
    description: z.string().nullable(),
    created: z.number(),
    payment_method: z.string().nullable(),
    payment_method_types: z.array(z.string()),
    usage: z.string(),
    cancellation_reason: z.string().nullable(),
    livemode: z.boolean(),
    metadata: z.record(z.string(), z.unknown())
});

const SetupIntentListApiSchema = z.object({
    object: z.string(),
    url: z.string(),
    has_more: z.boolean(),
    data: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync setup intents from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/setup-intents'
        }
    ],
    models: {
        SetupIntent: SetupIntentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            created_after: typeof rawCheckpoint?.created_after === 'number' ? rawCheckpoint.created_after : 0,
            starting_after: typeof rawCheckpoint?.starting_after === 'string' ? rawCheckpoint.starting_after : ''
        });

        const startTime = Math.floor(Date.now() / 1000);
        const createdAfter = checkpoint.created_after;
        let startingAfter = checkpoint.starting_after;

        let hasMore = true;
        while (hasMore) {
            // https://docs.stripe.com/api/setup_intents/list
            const params: Record<string, string | number> = {
                limit: 100
            };
            if (createdAfter > 0) {
                params['created[gte]'] = createdAfter;
            }
            if (startingAfter) {
                params['starting_after'] = startingAfter;
            }

            const response = await nango.get({
                endpoint: '/v1/setup_intents',
                params: params,
                retries: 3
            });

            const parsedList = SetupIntentListApiSchema.parse(response.data);
            const items = parsedList.data;

            if (items.length === 0) {
                break;
            }

            const parsedItems = items.map((item) => SetupIntentApiSchema.parse(item));

            const records = parsedItems.map((parsedItem) => {
                return {
                    id: parsedItem.id,
                    status: parsedItem.status,
                    ...(parsedItem.customer != null && { customer: parsedItem.customer }),
                    ...(parsedItem.description != null && { description: parsedItem.description }),
                    created: parsedItem.created,
                    ...(parsedItem.payment_method != null && { payment_method: parsedItem.payment_method }),
                    ...(parsedItem.payment_method_types.length > 0 && {
                        payment_method_types: parsedItem.payment_method_types
                    }),
                    usage: parsedItem.usage,
                    ...(parsedItem.cancellation_reason != null && {
                        cancellation_reason: parsedItem.cancellation_reason
                    }),
                    livemode: parsedItem.livemode,
                    ...(Object.keys(parsedItem.metadata).length > 0 && { metadata: parsedItem.metadata })
                };
            });

            await nango.batchSave(records, 'SetupIntent');

            hasMore = parsedList.has_more;
            if (!hasMore) {
                break;
            }

            const lastItem = parsedItems[parsedItems.length - 1];
            if (!lastItem) {
                break;
            }

            startingAfter = lastItem.id;
            await nango.saveCheckpoint({ created_after: createdAfter, starting_after: startingAfter });
        }

        await nango.saveCheckpoint({ created_after: startTime, starting_after: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
