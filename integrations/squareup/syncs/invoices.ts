import { createSync } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    location_index: z.number(),
    cursor: z.string(),
    // When the cursor was saved (empty string when there is no in-flight cursor). Square list/search
    // cursors generally expire after a few minutes, so if a run is interrupted (crash, timeout) and
    // resumed later using a stale cursor, Square would reject it. We use this to detect that case
    // and restart the current location's pagination from scratch instead of failing outright.
    cursor_saved_at: z.string()
});

// Conservative threshold below Square's typical ~5 minute cursor TTL.
const CURSOR_STALE_MS = 4 * 60 * 1000;

const LocationsResponseSchema = z.object({
    locations: z.array(
        z
            .object({
                id: z.string()
            })
            .passthrough()
    )
});

const InvoicesPageSchema = z.object({
    invoices: z.array(z.unknown()).optional()
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
        let checkpoint = rawCheckpoint == null ? { location_index: 0, cursor: '', cursor_saved_at: '' } : CheckpointSchema.parse(rawCheckpoint);

        // Square list/search cursors generally expire after ~5 minutes. If this run resumed from a
        // checkpoint saved longer ago than that, the stored cursor is likely no longer valid.
        // Discard it (but keep location_index) so the current location's pagination restarts from
        // its first page instead of failing on an expired-cursor error from Square.
        if (checkpoint.cursor && checkpoint.cursor_saved_at) {
            const savedAt = Date.parse(checkpoint.cursor_saved_at);
            if (!Number.isNaN(savedAt) && Date.now() - savedAt > CURSOR_STALE_MS) {
                checkpoint = { location_index: checkpoint.location_index, cursor: '', cursor_saved_at: '' };
            }
        }

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
            const startCursor = i === locationIndex && checkpoint.cursor ? checkpoint.cursor : undefined;

            // IMPORTANT: `on_page` fires one step "ahead" of the `for await` loop body's
            // processing of the same page - it advances `cursor` for the NEXT request before the
            // loop body below has finished with the CURRENT one. Stamping `cursor_saved_at` in the
            // loop body would therefore record the age of a cursor Square actually issued earlier
            // (during the PREVIOUS page's on_page call), making the staleness check think the
            // cursor is younger than it really is. Do the batchSave + checkpoint bookkeeping HERE
            // instead, where `response` and `nextPageParam` unambiguously correspond to the SAME
            // page, so `cursor_saved_at` reflects when that cursor was actually received.
            for await (const _page of nango.paginate({
                // https://developer.squareup.com/reference/square/invoices-api/list-invoices
                endpoint: '/v2/invoices',
                params: {
                    location_id: locationId,
                    limit: 100,
                    ...(startCursor ? { cursor: startCursor } : {})
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'cursor',
                    response_path: 'invoices',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam, response }) => {
                        const parsedPage = InvoicesPageSchema.safeParse(response.data);
                        if (!parsedPage.success) {
                            throw new Error(`Failed to parse invoices page: ${parsedPage.error.message}`);
                        }

                        const validInvoices = (parsedPage.data.invoices ?? []).map((invoice: unknown) => {
                            const parsed = InvoiceSchema.safeParse(invoice);
                            if (!parsed.success) {
                                throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                            }
                            return parsed.data;
                        });

                        if (validInvoices.length > 0) {
                            await nango.batchSave(validInvoices, 'Invoice');
                        }

                        const cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        await nango.saveCheckpoint({
                            location_index: i,
                            cursor: cursor ?? '',
                            cursor_saved_at: cursor ? new Date().toISOString() : ''
                        });
                    }
                },
                retries: 3
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            })) {
                // no-op; all per-page work happens in `on_page` above.
            }

            await nango.saveCheckpoint({
                location_index: i + 1,
                cursor: '',
                cursor_saved_at: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Invoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
