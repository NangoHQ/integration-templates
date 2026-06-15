import { z } from 'zod';
import { createAction } from 'nango';

const MeetingInviteeSchema = z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

const InputSchema = z.object({
    title: z.string().optional().describe('Title of the meeting.'),
    startTime: z.string().describe('The meeting start time in ISO-8601 format.'),
    endTime: z.string().describe('The meeting end time in ISO-8601 format.'),
    organizerEmail: z.string().email().describe('The email address of the user creating the meeting.'),
    externalId: z.string().optional().describe('The ID as it is formed on the external system.'),
    invitees: z.array(MeetingInviteeSchema).describe('A list of invitees to the event (not including the organizer).')
});

const MeetingInviteeResponseSchema = z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference Id.'),
    meetingId: z.string().describe("Gong's unique identifier for the meeting."),
    meetingUrl: z.string().describe('The Gong URL of the meeting.'),
    additionalInvitees: z.array(MeetingInviteeResponseSchema).optional().describe('Attendees added to the invitation.')
});

const action = createAction({
    description: 'Create a new Gong meeting (Beta).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-meeting',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:meetings:user:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            startTime: input.startTime,
            endTime: input.endTime,
            organizerEmail: input.organizerEmail,
            invitees: input.invitees
        };
        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.externalId !== undefined) {
            data['externalId'] = input.externalId;
        }

        let response;
        // @allowTryCatch: The Gong API may return 409 for account configuration issues
        // (e.g. consent page not enabled). We need to inspect the status code and
        // response body, so we catch the axios error and recover.
        try {
            response = await nango.post({
                // https://help.gong.io/apidocs/create-a-new-gong-meeting-v2meetings
                endpoint: '/v2/meetings',
                data,
                retries: 3
            });
        } catch (rawError: unknown) {
            if (
                typeof rawError === 'object' &&
                rawError !== null &&
                'response' in rawError &&
                typeof rawError.response === 'object' &&
                rawError.response !== null &&
                'status' in rawError.response &&
                rawError.response.status === 409 &&
                'data' in rawError.response
            ) {
                const errorBody = z
                    .object({
                        requestId: z.string().optional(),
                        errors: z.array(z.string()).optional()
                    })
                    .safeParse(rawError.response.data);
                throw new nango.ActionError({
                    type: 'account_configuration_error',
                    message: errorBody.data?.errors?.[0] ?? 'Consent page is not enabled in your company.'
                });
            }
            throw rawError;
        }

        if (response.status === 409) {
            const errorBody = z
                .object({
                    requestId: z.string().optional(),
                    errors: z.array(z.string()).optional()
                })
                .safeParse(response.data);
            throw new nango.ActionError({
                type: 'account_configuration_error',
                message: errorBody.data?.errors?.[0] ?? 'Consent page is not enabled in your company.'
            });
        }

        if (response.status !== 200) {
            const errorBody = z
                .object({
                    requestId: z.string().optional(),
                    errors: z.array(z.string()).optional()
                })
                .safeParse(response.data);
            throw new nango.ActionError({
                type: 'api_error',
                message: errorBody.data?.errors?.[0] ?? 'An unexpected error occurred while creating the meeting.',
                requestId: errorBody.data?.requestId
            });
        }

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
