import { z } from 'zod';
import { createAction } from 'nango';

const ParticipantSchema = z.object({
    participant: z.string(),
    type: z.enum(['contact', 'lead', 'user', 'email']),
    name: z.string().optional(),
    Email: z.string().optional()
});

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the event to update. Example: "5545974000002858122"'),
    Event_Title: z.string().optional().describe('The title of the event. Example: "Team Meeting"'),
    Start_DateTime: z.string().optional().describe('The start date and time of the event in ISO8601 format. Example: "2023-05-20T09:00:00+05:30"'),
    End_DateTime: z.string().optional().describe('The end date and time of the event in ISO8601 format. Example: "2023-05-20T10:00:00+05:30"'),
    All_day: z.boolean().optional().describe('Whether the event is an all-day event'),
    Description: z.string().optional().describe('Description of the event'),
    Venue: z.string().optional().describe('Location of the event'),
    Participants: z.array(ParticipantSchema).optional().describe('Array of participants for the event'),
    Remind_At: z
        .array(
            z.object({
                unit: z.number(),
                period: z.enum(['minutes', 'hours', 'days']),
                time: z.string().optional()
            })
        )
        .optional()
        .describe('Reminder settings for the event'),
    Recurring_Activity: z
        .object({
            RRULE: z.string().describe('Recurrence rule in iCalendar format. Example: "FREQ=DAILY;INTERVAL=1;UNTIL=2023-12-31"')
        })
        .optional()
        .describe('Recurring activity settings'),
    trigger: z
        .array(z.enum(['approval', 'workflow', 'blueprint']))
        .optional()
        .describe('Triggers to execute during update')
});

const ModifiedBySchema = z.object({
    name: z.string(),
    id: z.string()
});

const EventDetailSchema = z.object({
    Modified_Time: z.string(),
    Modified_By: ModifiedBySchema,
    Created_Time: z.string(),
    id: z.string(),
    Created_By: ModifiedBySchema
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: EventDetailSchema,
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated event'),
    message: z.string().describe('Status message from the API'),
    status: z.string().describe('Status of the update operation'),
    Modified_Time: z.string().optional().describe('The time when the event was modified'),
    Created_Time: z.string().optional().describe('The time when the event was created')
});

const action = createAction({
    description: 'Update an event in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-event',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.Events.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.Event_Title !== undefined) {
            updateData['Event_Title'] = input.Event_Title;
        }
        if (input.Start_DateTime !== undefined) {
            updateData['Start_DateTime'] = input.Start_DateTime;
        }
        if (input.End_DateTime !== undefined) {
            updateData['End_DateTime'] = input.End_DateTime;
        }
        if (input.All_day !== undefined) {
            updateData['All_day'] = input.All_day;
        }
        if (input.Description !== undefined) {
            updateData['Description'] = input.Description;
        }
        if (input.Venue !== undefined) {
            updateData['Venue'] = input.Venue;
        }
        if (input.Participants !== undefined) {
            updateData['Participants'] = input.Participants;
        }
        if (input.Remind_At !== undefined) {
            updateData['Remind_At'] = input.Remind_At;
        }
        if (input.Recurring_Activity !== undefined) {
            updateData['Recurring_Activity'] = input.Recurring_Activity;
        }

        const requestBody: Record<string, unknown> = {
            data: [updateData]
        };

        if (input.trigger !== undefined && input.trigger.length > 0) {
            requestBody['trigger'] = input.trigger;
        }

        const response = await nango.put({
            // https://www.zoho.com/crm/developer/docs/api/v2/update-records.html
            endpoint: `/crm/v2/Events/${input.record_id}`,
            data: requestBody,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 202) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to update event: ${response.status}`,
                status: response.status
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response format from Zoho CRM API',
                error: parsedResponse.error.message
            });
        }

        const result = parsedResponse.data.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No response data returned from update operation'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.message,
                code: result.code
            });
        }

        return {
            id: result.details.id,
            message: result.message,
            status: result.status,
            Modified_Time: result.details.Modified_Time,
            Created_Time: result.details.Created_Time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
