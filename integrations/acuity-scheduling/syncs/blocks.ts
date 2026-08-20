import { createSync } from 'nango';
import { z } from 'zod';

const BlockSchema = z.object({
    id: z.string(),
    calendarID: z.number().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    notes: z.string().optional(),
    title: z.string().optional()
});

const CheckpointSchema = z.object({
    window_start: z.string()
});

const ProviderBlockSchema = z.object({
    id: z.union([z.number(), z.string()]),
    calendarID: z.number().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    notes: z.string().optional(),
    title: z.string().optional()
});

const WINDOW_SIZE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WINDOWS_PER_EXECUTION = 52;
const MAX_RESULTS_PER_REQUEST = 10_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): Date {
    if (!DATE_PATTERN.test(value)) {
        throw new Error('Invalid checkpoint.window_start: expected YYYY-MM-DD.');
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
        throw new Error('Invalid checkpoint.window_start: expected a valid date.');
    }
    return date;
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

const sync = createSync({
    description: 'Sync calendar time blocks.',
    version: '1.1.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Block: BlockSchema
    },

    exec: async (nango) => {
        const fetchAndSave = async (params: { max?: number; minDate?: string; maxDate?: string }): Promise<void> => {
            // https://developers.acuityscheduling.com/reference/blocks
            const response = await nango.get({
                endpoint: '/blocks',
                params,
                retries: 3
            });

            const rawBlocks = z.array(ProviderBlockSchema).safeParse(response.data);
            if (!rawBlocks.success) {
                throw new Error('Failed to parse blocks response: expected an array of blocks');
            }

            const blocks = rawBlocks.data.map((block) => ({
                id: String(block.id),
                ...(block.calendarID !== undefined && { calendarID: block.calendarID }),
                ...(block.start !== undefined && { start: block.start }),
                ...(block.end !== undefined && { end: block.end }),
                ...(block.notes !== undefined && { notes: block.notes }),
                ...(block.title !== undefined && { title: block.title })
            }));

            if (blocks.length > 0) {
                await nango.batchSave(blocks, 'Block');
            }
        };

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        if (!parsedCheckpoint.success) {
            // Preserve the existing first-run behavior so upgrading the sync does
            // not introduce an arbitrary historical cutoff or lose old blocks.
            await fetchAndSave({});
            await nango.saveCheckpoint({ window_start: formatDate(today) });
            return;
        }

        let windowStart = parseDate(parsedCheckpoint.data.window_start);
        if (windowStart > today) {
            windowStart = today;
        }

        if (windowStart >= today) {
            // Blocks can be created for future dates. Re-read the current and
            // future range after the historical cursor is caught up so those
            // blocks are not delayed until their scheduled date.
            await fetchAndSave({
                max: MAX_RESULTS_PER_REQUEST,
                minDate: formatDate(today)
            });
            await nango.saveCheckpoint({ window_start: formatDate(today) });
            return;
        }

        for (let windowIndex = 0; windowIndex < MAX_WINDOWS_PER_EXECUTION; windowIndex++) {
            const windowEnd = new Date(Math.min(windowStart.getTime() + WINDOW_SIZE_MS, today.getTime()));

            await fetchAndSave({
                max: MAX_RESULTS_PER_REQUEST,
                minDate: formatDate(windowStart),
                maxDate: formatDate(windowEnd)
            });
            await nango.saveCheckpoint({ window_start: formatDate(windowEnd) });

            if (windowEnd >= today) {
                await fetchAndSave({
                    max: MAX_RESULTS_PER_REQUEST,
                    minDate: formatDate(today)
                });
                return;
            }
            windowStart = windowEnd;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
