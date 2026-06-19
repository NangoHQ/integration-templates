import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    max: z.number().int().optional().describe('Maximum number of results.'),
    minDate: z.string().optional().describe('Only get blocks this date and after (YYYY-MM-DD).'),
    maxDate: z.string().optional().describe('Only get blocks this date and before (YYYY-MM-DD).'),
    calendarID: z.number().int().optional().describe('Only get blocks on calendar with this ID.')
});

const ProviderBlockSchema = z.object({
    id: z.number().int(),
    description: z.string(),
    until: z.string().nullable(),
    recurring: z.string().nullable(),
    notes: z.string().nullable(),
    end: z.string(),
    start: z.string(),
    calendarID: z.number().int()
});

const ProviderBlocksSchema = z.array(ProviderBlockSchema);

const BlockSchema = z.object({
    id: z.number().int(),
    description: z.string(),
    until: z.string().optional(),
    recurring: z.string().optional(),
    notes: z.string().optional(),
    end: z.string(),
    start: z.string(),
    calendarID: z.number().int()
});

const OutputSchema = z.object({
    items: z.array(BlockSchema)
});

const action = createAction({
    description: 'List calendar time blocks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/get-blocks
        const response = await nango.get({
            endpoint: '/blocks',
            params: {
                ...(input.max !== undefined && { max: String(input.max) }),
                ...(input.minDate !== undefined && { minDate: input.minDate }),
                ...(input.maxDate !== undefined && { maxDate: input.maxDate }),
                ...(input.calendarID !== undefined && { calendarID: String(input.calendarID) })
            },
            retries: 3
        });

        const providerBlocks = ProviderBlocksSchema.parse(response.data);

        return {
            items: providerBlocks.map((block) => ({
                id: block.id,
                description: block.description,
                ...(block.until !== null && { until: block.until }),
                ...(block.recurring !== null && { recurring: block.recurring }),
                ...(block.notes !== null && { notes: block.notes }),
                end: block.end,
                start: block.start,
                calendarID: block.calendarID
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
