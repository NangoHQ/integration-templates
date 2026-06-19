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

const sync = createSync({
    description: 'Sync calendar time blocks.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Block: BlockSchema
    },

    exec: async (nango) => {
        // Blocker: GET /blocks does not support updated/modified filters,
        // cursors, or page tokens. It returns a full snapshot of all blocks.
        await nango.trackDeletesStart('Block');

        // https://developers.acuityscheduling.com/reference/get-blocks
        const response = await nango.get({
            endpoint: '/blocks',
            retries: 3
        });

        const rawBlocks = z.array(z.unknown()).safeParse(response.data);
        if (!rawBlocks.success) {
            throw new Error('Failed to parse blocks response: expected array');
        }

        const blocks = rawBlocks.data
            .map((item: unknown) => {
                const parsed = z
                    .object({
                        id: z.union([z.number(), z.string()]),
                        calendarID: z.number().optional(),
                        start: z.string().optional(),
                        end: z.string().optional(),
                        notes: z.string().optional(),
                        title: z.string().optional()
                    })
                    .safeParse(item);

                if (!parsed.success) {
                    throw new Error('Failed to parse block from provider response');
                }

                return {
                    id: String(parsed.data.id),
                    ...(parsed.data.calendarID !== undefined && { calendarID: parsed.data.calendarID }),
                    ...(parsed.data.start !== undefined && { start: parsed.data.start }),
                    ...(parsed.data.end !== undefined && { end: parsed.data.end }),
                    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
                    ...(parsed.data.title !== undefined && { title: parsed.data.title })
                };
            })
            .filter(
                (block): block is { id: string; calendarID?: number; start?: string; end?: string; notes?: string; title?: string } => block.id !== undefined
            );

        if (blocks.length > 0) {
            await nango.batchSave(blocks, 'Block');
        }

        await nango.trackDeletesEnd('Block');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
