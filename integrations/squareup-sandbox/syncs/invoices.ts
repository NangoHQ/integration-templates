import { createSync } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    location_index: z.number(),
    cursor: z.string()
});

const LocationsResponseSchema = z.object({
    locations: z.array(
        z
            .object({
                id: z.string()
            })
            .passthrough()
    )
});

const sync = createSync({
    description: 'Sync invoices.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { location_index: 0, cursor: '' } : CheckpointSchema.parse(rawCheckpoint);

        // https://developer.squareup.com/reference/square/locations-api/list-locations
        const locationsResponse = await nango.get({
            endpoint: '/v2/locations',
            retries: 3
        });

        const locationsData = LocationsResponseSchema.parse(locationsResponse.data);
        const locations = locationsData.locations;
        if (locations.length === 0) {
            return;
        }

        const locationIndex = checkpoint.location_index;

        await nango.trackDeletesStart('Invoice');

        for (const [i, location] of locations.entries()) {
            if (i < locationIndex) {
                continue;
            }
            const locationId = location.id;
            let cursor = i === locationIndex && checkpoint.cursor ? checkpoint.cursor : undefined;

            for await (const invoices of nango.paginate({
                // https://developer.squareup.com/reference/square/invoices-api/list-invoices
                endpoint: '/v2/invoices',
                params: {
                    location_id: locationId,
                    limit: 100,
                    ...(cursor ? { cursor } : {})
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'cursor',
                    response_path: 'invoices',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            })) {
                const validInvoices = invoices.map((invoice: unknown) => {
                    const parsed = InvoiceSchema.safeParse(invoice);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                if (validInvoices.length > 0) {
                    await nango.batchSave(validInvoices, 'Invoice');
                }

                await nango.saveCheckpoint({
                    location_index: i,
                    cursor: cursor ?? ''
                });
            }

            await nango.saveCheckpoint({
                location_index: i + 1,
                cursor: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Invoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
