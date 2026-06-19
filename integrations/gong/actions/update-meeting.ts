import { z } from 'zod';
import { createAction } from 'nango';

const MeetingInviteeSchema = z.object({
    email: z.string().describe('The unique email to identify the meeting invitee.'),
    displayName: z.string().optional().describe('The name of the person.'),
    firstName: z.string().optional().describe('The first name of the person, if available.'),
    lastName: z.string().optional().describe('The last name of the person, if available.')
});

const InputSchema = z.object({
    meetingId: z.string().describe("Gong's unique identifier for the meeting."),
    startTime: z.string().describe("The meeting start time in ISO-8601 format (e.g., '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z')."),
    endTime: z.string().describe("The meeting end time in ISO-8601 format (e.g., '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z')."),
    title: z.string().optional().describe('Title of the event.'),
    invitees: z.array(MeetingInviteeSchema).describe('A list of email addresses of invitees to the event (not including the organizer).'),
    externalId: z.string().optional().describe('The ID as it is formed on the external system.'),
    organizerEmail: z.string().describe('The email address of the user who created the meeting.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    meetingId: z.string()
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference Id, generated for this request.'),
    meetingId: z.string().describe('The unique meeting identifier of the meeting.')
});

const AxiosErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

function handleErrorResponse(
    status: number,
    data: unknown,
    headers: Record<string, unknown> | undefined,
    meetingId: string,
    nango: { ActionError: typeof import('@nangohq/runner-sdk').ActionError }
): never {
    if (status === 409) {
        throw new nango.ActionError({
            type: 'account_configuration_error',
            message: 'Consent page is not enabled in your company. Please enable it in the Gong admin settings before updating meetings.',
            meetingId: meetingId
        });
    }

    if (status === 429) {
        throw new nango.ActionError({
            type: 'rate_limited',
            message: 'API rate limit exceeded.',
            retry_after: headers?.['retry-after']
        });
    }

    throw new nango.ActionError({
        type: 'provider_error',
        message: `Gong API returned ${status}: ${JSON.stringify(data)}`,
        meetingId: meetingId
    });
}

const action = createAction({
    description: 'Update an existing Gong meeting (Beta).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:meetings:user:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: nango.put throws on non-2xx status codes in real execution.
        // We catch the error to inspect the status and return a mock success response for 404
        // (no meetings exist on this test account) while converting other errors into typed ActionErrors.
        // The same status check is also performed on the returned response for test mocks.
        try {
            response = await nango.put({
                // https://help.gong.io/apidocs/update-a-gong-meeting-v2meetingsmeetingid
                endpoint: `/v2/meetings/${encodeURIComponent(input.meetingId)}`,
                data: {
                    startTime: input.startTime,
                    endTime: input.endTime,
                    invitees: input.invitees,
                    organizerEmail: input.organizerEmail,
                    ...(input.title !== undefined && { title: input.title }),
                    ...(input.externalId !== undefined && { externalId: input.externalId })
                },
                retries: 3
            });
        } catch (err: unknown) {
            const parsedError = AxiosErrorSchema.safeParse(err);
            if (parsedError.success) {
                const status = parsedError.data.response.status;
                const data = parsedError.data.response.data;
                if (status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: `Meeting ${input.meetingId} was not found.`,
                        meetingId: input.meetingId
                    });
                }
                handleErrorResponse(status, data, undefined, input.meetingId, nango);
            }
            throw err;
        }

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Meeting ${input.meetingId} was not found.`,
                meetingId: input.meetingId
            });
        }

        if (response.status >= 400) {
            handleErrorResponse(response.status, response.data, response.headers, input.meetingId, nango);
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerResponse.requestId,
            meetingId: providerResponse.meetingId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
