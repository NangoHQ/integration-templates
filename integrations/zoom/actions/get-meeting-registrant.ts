import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meetingId: z.string().describe('The meeting ID. Example: "88233737762"'),
    registrantId: z.string().describe('The registrant ID. Example: "ESJWWYqvTDWFGNUqJzB_bQ"')
});

const CustomQuestionSchema = z.object({
    title: z.string().optional(),
    value: z.string().optional()
});

const ProviderRegistrantSchema = z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string().optional(),
    email: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    industry: z.string().optional(),
    org: z.string().optional(),
    job_title: z.string().optional(),
    purchasing_time_frame: z.string().optional(),
    role_in_purchase_process: z.string().optional(),
    no_of_employees: z.string().optional(),
    comments: z.string().optional(),
    custom_questions: z.array(CustomQuestionSchema).optional(),
    status: z.string().optional(),
    create_time: z.string().optional(),
    join_url: z.string().optional()
});

const OutputSchema = ProviderRegistrantSchema;

const action = createAction({
    description: 'Retrieve a single meeting registrant from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-meeting-registrant',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:read:registrant:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/
            endpoint: `/meetings/${input.meetingId}/registrants/${input.registrantId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Meeting registrant not found',
                meetingId: input.meetingId,
                registrantId: input.registrantId
            });
        }

        const registrant = ProviderRegistrantSchema.parse(response.data);

        return registrant;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
