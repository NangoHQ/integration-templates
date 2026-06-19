import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCalendarSchema = z.object({
    id: z.number().describe('Calendar ID. Example: 14209019'),
    name: z.string().describe('Calendar name. Example: "Nango API"'),
    email: z.string().optional(),
    replyTo: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),
    image: z.unknown().optional(),
    thumbnail: z.unknown().optional(),
    isValid: z.unknown().optional()
});

const OutputSchema = z.object({
    calendars: z.array(ProviderCalendarSchema)
});

const action = createAction({
    description: 'List calendars.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/get-calendars
        const response = await nango.get({
            endpoint: '/calendars',
            retries: 3
        });

        const parsed = z.array(ProviderCalendarSchema).parse(response.data);

        return {
            calendars: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
