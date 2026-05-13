import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('Meeting ID or UUID. Example: "123456789"'),
    status: z.string().optional().describe('Registrant status filter. Values: approved, pending, denied'),
    page_size: z.number().optional().describe('Number of records per page. Default: 30, Max: 300'),
    cursor: z.string().optional().describe('Pagination cursor (next_page_token) from the previous response. Omit for the first page.')
});

const ProviderCustomQuestionSchema = z.object({
    title: z.string().optional(),
    value: z.string().optional()
});

const ProviderRegistrantSchema = z.object({
    id: z.string().optional(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    comments: z.string().optional(),
    country: z.string().optional(),
    custom_questions: z.array(ProviderCustomQuestionSchema).optional(),
    industry: z.string().optional(),
    job_title: z.string().optional(),
    no_of_employees: z.string().optional(),
    org: z.string().optional(),
    phone: z.string().optional(),
    purchasing_time_frame: z.string().optional(),
    role_in_purchase_process: z.string().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
    zip: z.string().optional(),
    create_time: z.string().optional(),
    join_url: z.string().optional()
});

const RegistrantOutputSchema = z.object({
    id: z.string().optional(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    comments: z.string().optional(),
    country: z.string().optional(),
    custom_questions: z.array(ProviderCustomQuestionSchema).optional(),
    industry: z.string().optional(),
    job_title: z.string().optional(),
    no_of_employees: z.string().optional(),
    org: z.string().optional(),
    phone: z.string().optional(),
    purchasing_time_frame: z.string().optional(),
    role_in_purchase_process: z.string().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
    zip: z.string().optional(),
    create_time: z.string().optional(),
    join_url: z.string().optional()
});

const OutputSchema = z.object({
    registrants: z.array(RegistrantOutputSchema),
    next_page_token: z.string().optional(),
    page_size: z.number().optional(),
    total_records: z.number().optional()
});

const action = createAction({
    description: 'List meeting registrants from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-meeting-registrants',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:read:list_registrants:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/meetings/#tag/Meeting-Registrants/operation/meetingRegistrants
            endpoint: `/meetings/${input.meeting_id}/registrants`,
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.cursor !== undefined && { next_page_token: input.cursor })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            registrants: z.array(ProviderRegistrantSchema).optional().default([]),
            next_page_token: z.string().optional(),
            page_size: z.number().optional(),
            total_records: z.number().optional()
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            registrants: providerData.registrants.map((registrant) => ({
                ...(registrant.id !== undefined && { id: registrant.id }),
                email: registrant.email,
                first_name: registrant.first_name,
                ...(registrant.last_name !== undefined && { last_name: registrant.last_name }),
                ...(registrant.address !== undefined && { address: registrant.address }),
                ...(registrant.city !== undefined && { city: registrant.city }),
                ...(registrant.comments !== undefined && { comments: registrant.comments }),
                ...(registrant.country !== undefined && { country: registrant.country }),
                ...(registrant.custom_questions !== undefined && { custom_questions: registrant.custom_questions }),
                ...(registrant.industry !== undefined && { industry: registrant.industry }),
                ...(registrant.job_title !== undefined && { job_title: registrant.job_title }),
                ...(registrant.no_of_employees !== undefined && { no_of_employees: registrant.no_of_employees }),
                ...(registrant.org !== undefined && { org: registrant.org }),
                ...(registrant.phone !== undefined && { phone: registrant.phone }),
                ...(registrant.purchasing_time_frame !== undefined && { purchasing_time_frame: registrant.purchasing_time_frame }),
                ...(registrant.role_in_purchase_process !== undefined && { role_in_purchase_process: registrant.role_in_purchase_process }),
                ...(registrant.state !== undefined && { state: registrant.state }),
                ...(registrant.status !== undefined && { status: registrant.status }),
                ...(registrant.zip !== undefined && { zip: registrant.zip }),
                ...(registrant.create_time !== undefined && { create_time: registrant.create_time }),
                ...(registrant.join_url !== undefined && { join_url: registrant.join_url })
            })),
            ...(providerData.next_page_token !== undefined && { next_page_token: providerData.next_page_token }),
            ...(providerData.page_size !== undefined && { page_size: providerData.page_size }),
            ...(providerData.total_records !== undefined && { total_records: providerData.total_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
