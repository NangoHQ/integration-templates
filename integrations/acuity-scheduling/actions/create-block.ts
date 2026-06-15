import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.string().describe('Start time of the block. Example: "2026-07-15T09:00:00+0300"'),
    end: z.string().describe('End time of the block. Example: "2026-07-15T10:00:00+0300"'),
    calendarID: z.number().describe('Calendar ID for the block. Example: 14209019'),
    notes: z.string().optional().describe('Optional notes for the block.')
});

const ProviderBlockSchema = z.object({
    id: z.number(),
    calendarID: z.number().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    notes: z.string().optional(),
    owner: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    calendarID: z.number().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    notes: z.string().optional(),
    owner: z.string().optional()
});

const action = createAction({
    description: 'Create a calendar time block.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-block',
        group: 'Blocks'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/post-blocks
        const response = await nango.post({
            endpoint: '/blocks',
            data: {
                start: input.start,
                end: input.end,
                calendarID: input.calendarID,
                ...(input.notes !== undefined && { notes: input.notes })
            },
            retries: 3
        });

        const providerBlock = ProviderBlockSchema.parse(response.data);

        return {
            id: providerBlock.id,
            ...(providerBlock.calendarID !== undefined && { calendarID: providerBlock.calendarID }),
            ...(providerBlock.start !== undefined && { start: providerBlock.start }),
            ...(providerBlock.end !== undefined && { end: providerBlock.end }),
            ...(providerBlock.notes !== undefined && { notes: providerBlock.notes }),
            ...(providerBlock.owner !== undefined && { owner: providerBlock.owner })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
