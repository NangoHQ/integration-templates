import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The meeting ID or meeting number. Example: "85746065"'),
    occurrence_ids: z.string().optional().describe('Occurrence IDs. You can find these with the meeting get API. Multiple values separated by comma.'),
    email: z.string().email().describe('A valid email address of the registrant.'),
    first_name: z.string().max(64).describe("The registrant's first name."),
    last_name: z.string().max(64).optional().describe("The registrant's last name."),
    address: z.string().optional().describe("The registrant's address."),
    city: z.string().optional().describe("The registrant's city."),
    country: z.string().optional().describe("The registrant's country in two-letter abbreviated form."),
    zip: z.string().optional().describe("The registrant's zip or postal code."),
    state: z.string().optional().describe("The registrant's state or province."),
    phone: z.string().optional().describe("The registrant's phone number."),
    industry: z.string().optional().describe("The registrant's industry."),
    org: z.string().optional().describe("The registrant's organization."),
    job_title: z.string().optional().describe("The registrant's job title."),
    purchasing_time_frame: z.string().optional().describe("The registrant's purchasing time frame."),
    role_in_purchase_process: z.string().optional().describe("The registrant's role in the purchase process."),
    no_of_employees: z.string().optional().describe("The registrant's number of employees."),
    comments: z.string().optional().describe('Any questions or comments from the registrant.'),
    custom_questions: z
        .array(
            z.object({
                title: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
        .describe('Custom questions and answers from the registrant.')
});

const ProviderResponseSchema = z.object({
    id: z.number().optional(),
    join_url: z.string().optional(),
    registrant_id: z.string().optional(),
    start_time: z.string().optional(),
    topic: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().optional(),
    join_url: z.string().optional(),
    registrant_id: z.string().optional(),
    start_time: z.string().optional(),
    topic: z.string().optional()
});

const action = createAction({
    description: 'Create a meeting registrant in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-meeting-registrant',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:write:admin', 'meeting:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api-reference/zoom-api/methods/#operation/meetingRegistrantCreate
        const response = await nango.post({
            endpoint: `/meetings/${input.meeting_id}/registrants`,
            params: {
                ...(input.occurrence_ids !== undefined && { occurrence_ids: input.occurrence_ids })
            },
            data: {
                email: input.email,
                first_name: input.first_name,
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.city !== undefined && { city: input.city }),
                ...(input.country !== undefined && { country: input.country }),
                ...(input.zip !== undefined && { zip: input.zip }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.industry !== undefined && { industry: input.industry }),
                ...(input.org !== undefined && { org: input.org }),
                ...(input.job_title !== undefined && { job_title: input.job_title }),
                ...(input.purchasing_time_frame !== undefined && { purchasing_time_frame: input.purchasing_time_frame }),
                ...(input.role_in_purchase_process !== undefined && { role_in_purchase_process: input.role_in_purchase_process }),
                ...(input.no_of_employees !== undefined && { no_of_employees: input.no_of_employees }),
                ...(input.comments !== undefined && { comments: input.comments }),
                ...(input.custom_questions !== undefined && { custom_questions: input.custom_questions })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.id !== undefined && { id: providerResponse.id }),
            ...(providerResponse.join_url !== undefined && { join_url: providerResponse.join_url }),
            ...(providerResponse.registrant_id !== undefined && { registrant_id: providerResponse.registrant_id }),
            ...(providerResponse.start_time !== undefined && { start_time: providerResponse.start_time }),
            ...(providerResponse.topic !== undefined && { topic: providerResponse.topic })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
