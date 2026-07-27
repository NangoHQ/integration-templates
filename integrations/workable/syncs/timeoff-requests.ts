import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DEFAULT_EPOCH = '1970-01-01';
const RESWEEP_WINDOW_DAYS = 90;
const BACKFILL_CHUNK_DAYS = 180;

const HalfDaySchema = z.object({
    date: z.string(),
    half: z.string()
});

const PendingApprovalSchema = z.object({
    id: z.string(),
    approver_id: z.string()
});

const ProviderTimeOffRequestSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    from_date: z.string(),
    to_date: z.string(),
    formatted_period: z.string(),
    state: z.string(),
    requesting_total: z.number(),
    timeoff_tracking_unit: z.string(),
    half_days: z.array(HalfDaySchema).optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional(),
    category_name: z.string().optional(),
    pending_approvals: z.array(PendingApprovalSchema).optional()
});

const TimeOffRequestSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    from_date: z.string(),
    to_date: z.string(),
    formatted_period: z.string(),
    state: z.string(),
    requesting_total: z.number(),
    timeoff_tracking_unit: z.string(),
    half_days: z.array(HalfDaySchema).optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional(),
    category_name: z.string().optional(),
    pending_approvals: z.array(PendingApprovalSchema).optional()
});

const CheckpointSchema = z.object({
    next_from_date: z.string(),
    last_resweep_date: z.string()
});

const MetadataSchema = z.object({
    maxLookbackDays: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
            'Optional: caps the historical backfill window to this many days before today, instead of backfilling all the way from 1970-01-01. Intended for testing/dry runs so the initial backfill does not walk decades of history; omit in production for a complete historical backfill.'
        )
});

function getTodayDate(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10);
}

function formatApiDate(dateStr: string): string {
    return `${dateStr}T00:00:00.000`;
}

function addDays(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function diffDays(start: string, end: string): number {
    const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
    return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24));
}

const sync = createSync({
    description: 'Sync employee time-off requests and their approval state.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        TimeOffRequest: TimeOffRequestSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { next_from_date: '', last_resweep_date: '' });
        const today = getTodayDate();
        const resweepFrom = addDays(today, -RESWEEP_WINDOW_DAYS);
        const backfillFloor = metadata?.maxLookbackDays != null ? addDays(today, -metadata.maxLookbackDays) : DEFAULT_EPOCH;
        let currentLastResweepDate = checkpoint.last_resweep_date;

        if (currentLastResweepDate !== today) {
            await nango.log(`Re-sweeping trailing window from ${resweepFrom}`);

            const reSweepConfig: ProxyConfiguration = {
                // https://workable.readme.io/reference/timeoffrequests-1
                endpoint: '/spi/v3/timeoff/requests',
                params: {
                    from_date: formatApiDate(resweepFrom)
                },
                // offset_calculation_method intentionally omitted; the Nango SDK default
                // 'by-response-size' correctly increments offset by the number of returned
                // items, which matches Workable's item-skip semantics.
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    offset_start_value: 0,
                    limit_name_in_request: 'limit',
                    limit: 100,
                    response_path: 'requests'
                },
                retries: 3
            };

            for await (const page of nango.paginate(reSweepConfig)) {
                const requests = page.map((record: unknown) => {
                    const parsed = ProviderTimeOffRequestSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse time-off request: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                if (requests.length > 0) {
                    await nango.batchSave(requests, 'TimeOffRequest');
                }
            }

            const nextFromDate = checkpoint.next_from_date;
            await nango.saveCheckpoint({
                next_from_date: nextFromDate,
                last_resweep_date: today
            });

            currentLastResweepDate = today;
        }

        let currentFrom = checkpoint.next_from_date || backfillFloor;
        if (currentFrom < resweepFrom) {
            await nango.log(`Backfilling from ${currentFrom} up to ${resweepFrom}`);

            while (currentFrom < resweepFrom) {
                const chunkDays = Math.min(BACKFILL_CHUNK_DAYS, diffDays(currentFrom, resweepFrom));
                const chunkTo = addDays(currentFrom, chunkDays);

                const backfillConfig: ProxyConfiguration = {
                    // https://workable.readme.io/reference/timeoffrequests-1
                    endpoint: '/spi/v3/timeoff/requests',
                    params: {
                        from_date: formatApiDate(currentFrom),
                        to_date: formatApiDate(chunkTo)
                    },
                    // offset_calculation_method intentionally omitted; the Nango SDK default
                    // 'by-response-size' correctly increments offset by the number of returned
                    // items, which matches Workable's item-skip semantics.
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'offset',
                        offset_start_value: 0,
                        limit_name_in_request: 'limit',
                        limit: 100,
                        response_path: 'requests'
                    },
                    retries: 3
                };

                for await (const page of nango.paginate(backfillConfig)) {
                    const requests = page.map((record: unknown) => {
                        const parsed = ProviderTimeOffRequestSchema.safeParse(record);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse time-off request: ${parsed.error.message}`);
                        }
                        return parsed.data;
                    });

                    if (requests.length > 0) {
                        await nango.batchSave(requests, 'TimeOffRequest');
                    }
                }

                currentFrom = chunkTo;
                await nango.saveCheckpoint({
                    next_from_date: currentFrom,
                    last_resweep_date: currentLastResweepDate
                });
            }
        }

        await nango.log('Time-off request sync complete');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
