import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    availabilityKey: z.string().describe('Availability key obtained from get-availability-key for the same intent. Example: "avl_..."')
});

const SlotSchema = z.object({
    startsAt: z.string().describe('Slot start time in epoch milliseconds. Example: "1785430800000"'),
    freeUnits: z.number().describe('Number of free units available for this slot.')
});

const OutputSchema = z.object({
    slots: z.array(SlotSchema)
});

const action = createAction({
    description: "Get the list of open time slots for a booking intent's search window.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.youcanbook.me/docs/index.html
            endpoint: `/v1/availabilities/${encodeURIComponent(input.availabilityKey)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                slots: z.array(
                    z.object({
                        startsAt: z.string(),
                        freeUnits: z.number()
                    })
                )
            })
            .parse(response.data);

        return {
            slots: providerResponse.slots.map((slot) => ({
                startsAt: slot.startsAt,
                freeUnits: slot.freeUnits
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
