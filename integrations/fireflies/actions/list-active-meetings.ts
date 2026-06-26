import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().optional().describe('Filter active meetings by a specific user email address. Example: "user@example.com"'),
    states: z
        .array(z.enum(['active', 'paused']))
        .optional()
        .describe('Filter active meetings by their state. Possible values: "active", "paused". If omitted, both states are returned.')
});

const MeetingPrivacySchema = z.enum(['link', 'owner', 'participants', 'teammates_and_participants', 'participating_teammates', 'teammates']);

const ActiveMeetingSchema = z.object({
    id: z.string().describe('Unique identifier for the active meeting. Example: "meeting-id-1"'),
    title: z.string().describe('Title of the active meeting. Example: "Team Standup"'),
    organizer_email: z.string().optional().describe('Email address of the meeting organizer. Example: "user@example.com"'),
    meeting_link: z.string().optional().describe('The URL link to join the meeting. Example: "https://zoom.us/j/123456789"'),
    start_time: z.string().optional().describe('ISO 8601 formatted timestamp indicating when the meeting started. Example: "2024-01-15T10:00:00.000Z"'),
    end_time: z
        .string()
        .optional()
        .describe('ISO 8601 formatted timestamp indicating when the meeting is scheduled to end. Example: "2024-01-15T11:00:00.000Z"'),
    privacy: MeetingPrivacySchema.optional().describe(
        'Privacy setting for the meeting. Possible values: "link", "owner", "participants", "teammates_and_participants", "participating_teammates", "teammates"'
    ),
    state: z.enum(['active', 'paused']).optional().describe('Current state of the meeting. Possible values: "active", "paused"')
});

const OutputSchema = z.object({
    meetings: z.array(ActiveMeetingSchema).describe('List of currently active/live meetings')
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        active_meetings: z.array(z.unknown())
    })
});

const action = createAction({
    description: 'List currently active/live meetings',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: { input: { email?: string; states?: string[] } } = {
            input: {
                ...(input.email !== undefined && { email: input.email }),
                ...(input.states !== undefined && { states: input.states })
            }
        };

        // https://docs.fireflies.ai/graphql-api/query/active-meetings
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query ActiveMeetings($input: GetActiveMeetingsInput) { active_meetings(input: $input) { id title organizer_email meeting_link start_time end_time privacy state } }',
                variables
            },
            retries: 3
        });

        const parsedResponse = GraphQLResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Fireflies API',
                details: parsedResponse.error.message
            });
        }

        const meetings = parsedResponse.data.data.active_meetings.map((meeting: unknown) => {
            const parsedMeeting = ActiveMeetingSchema.safeParse(meeting);
            if (!parsedMeeting.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid meeting object in Fireflies API response',
                    details: parsedMeeting.error.message
                });
            }
            return parsedMeeting.data;
        });

        return { meetings };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
