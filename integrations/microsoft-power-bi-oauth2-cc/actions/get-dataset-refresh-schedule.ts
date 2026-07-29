import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('The workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('The dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const ProviderRefreshScheduleSchema = z.object({
    days: z.array(z.string()).optional(),
    times: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    localTimeZoneId: z.string().optional(),
    notifyOption: z.string().optional()
});

const OutputSchema = z.object({
    days: z.array(z.string()).optional(),
    times: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    localTimeZoneId: z.string().optional(),
    notifyOption: z.string().optional()
});

const action = createAction({
    description: 'Get the configured refresh schedule for a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-schedule
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/refreshSchedule`,
            retries: 3
        });

        const schedule = ProviderRefreshScheduleSchema.parse(response.data);

        return {
            ...(schedule.days !== undefined && { days: schedule.days }),
            ...(schedule.times !== undefined && { times: schedule.times }),
            ...(schedule.enabled !== undefined && { enabled: schedule.enabled }),
            ...(schedule.localTimeZoneId !== undefined && { localTimeZoneId: schedule.localTimeZoneId }),
            ...(schedule.notifyOption !== undefined && { notifyOption: schedule.notifyOption })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
