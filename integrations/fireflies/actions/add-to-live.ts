import { z } from 'zod';
import { createAction } from 'nango';

const AttendeeInputSchema = z.object({
    displayName: z.string().optional().describe('Display name of the attendee as it appears in meeting platforms.'),
    email: z.string().optional().describe('Email address of the attendee.'),
    phoneNumber: z.string().optional().describe('Phone number of the attendee.')
});

const InputSchema = z.object({
    url: z.string().describe('A valid HTTP URL for the meeting link, e.g. Google Meet, Zoom, etc.'),
    title: z.string().optional().describe('Title or name of the meeting. Maximum length is 256 characters.'),
    attendees: z.array(AttendeeInputSchema).optional().describe('Array of expected meeting participants.')
});

const ProviderAddToLiveMeetingSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Add Fireflies bot to a live meeting by URL.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            meeting_link: input.url
        };

        if (input.title !== undefined) {
            variables['title'] = input.title;
        }

        if (input.attendees !== undefined && input.attendees.length > 0) {
            variables['attendees'] = input.attendees.map((attendee) => ({
                ...(attendee.displayName !== undefined && { displayName: attendee.displayName }),
                ...(attendee.email !== undefined && { email: attendee.email }),
                ...(attendee.phoneNumber !== undefined && { phoneNumber: attendee.phoneNumber })
            }));
        }

        const mutation = `
            mutation AddToLiveMeeting($meeting_link: String!, $title: String, $attendees: [AttendeeInput!]) {
                addToLiveMeeting(meeting_link: $meeting_link, title: $title, attendees: $attendees) {
                    success
                    message
                }
            }
        `;

        // https://docs.fireflies.ai/graphql-api/mutation/add-to-live
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables
            },
            retries: 1
        });

        const data = response.data;
        if (data == null || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Fireflies API'
            });
        }

        const dataRecord = z.record(z.string(), z.unknown()).parse(data);
        const errors = dataRecord['errors'];
        if (Array.isArray(errors) && errors.length > 0) {
            const firstError = errors[0];
            if (firstError != null && typeof firstError === 'object') {
                const errorRecord = z.record(z.string(), z.unknown()).parse(firstError);
                const errorMessage = typeof errorRecord['message'] === 'string' ? errorRecord['message'] : 'Fireflies API returned an error';
                const errorCode = typeof errorRecord['code'] === 'string' ? errorRecord['code'] : undefined;
                throw new nango.ActionError({
                    type: 'api_error',
                    message: errorMessage,
                    ...(errorCode !== undefined && { code: errorCode })
                });
            }
        }

        const responseData = dataRecord['data'];
        if (responseData == null || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in Fireflies API response'
            });
        }

        const responseDataRecord = z.record(z.string(), z.unknown()).parse(responseData);
        const addToLiveMeeting = responseDataRecord['addToLiveMeeting'];
        if (addToLiveMeeting == null || typeof addToLiveMeeting !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing addToLiveMeeting in Fireflies API response'
            });
        }

        const result = ProviderAddToLiveMeetingSchema.parse(addToLiveMeeting);

        return {
            success: result.success,
            ...(result.message != null && { message: result.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
