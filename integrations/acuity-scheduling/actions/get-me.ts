import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderMeSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    timezone: z.string().optional(),
    schedulingPage: z.string().optional(),
    calendar: z.string().optional(),
    timeZoneName: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    timezone: z.string().optional(),
    schedulingPage: z.string().optional(),
    calendar: z.string().optional(),
    timeZoneName: z.string().optional()
});

const action = createAction({
    description: "Retrieve the authenticated user's account information.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-me',
        group: 'Account'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-me
            endpoint: '/me',
            retries: 3
        });

        const providerMe = ProviderMeSchema.parse(response.data);

        return {
            id: providerMe.id,
            ...(providerMe.firstName !== undefined && { firstName: providerMe.firstName }),
            ...(providerMe.lastName !== undefined && { lastName: providerMe.lastName }),
            ...(providerMe.name !== undefined && { name: providerMe.name }),
            ...(providerMe.email !== undefined && { email: providerMe.email }),
            ...(providerMe.timezone !== undefined && { timezone: providerMe.timezone }),
            ...(providerMe.schedulingPage !== undefined && { schedulingPage: providerMe.schedulingPage }),
            ...(providerMe.calendar !== undefined && { calendar: providerMe.calendar }),
            ...(providerMe.timeZoneName !== undefined && { timeZoneName: providerMe.timeZoneName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
