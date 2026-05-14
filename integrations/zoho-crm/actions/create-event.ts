import { z } from 'zod';
import { createAction } from 'nango';

const ParticipantSchema = z.object({
    Email: z.string().email().optional(),
    name: z.string().optional(),
    participant: z.string().optional(),
    type: z.enum(['lead', 'contact', 'user', 'email']).optional(),
    invited: z.boolean().optional()
});

const TagSchema = z.object({
    name: z.string()
});

const WhatIdInputSchema = z.object({
    id: z.string().describe('The unique ID of the related record (Account, Deal, Lead, etc.).'),
    module: z.string().describe('The API name of the module. Example: "Accounts", "Deals", "Leads"')
});

const WhoIdInputSchema = z.object({
    id: z.string().describe('The unique ID of the contact to associate with this event.')
});

const InputSchema = z.object({
    event_title: z.string().describe('Title of the event. Maximum 255 characters.'),
    start_datetime: z.string().describe('Start date and time in ISO8601 format. Example: "2024-08-02T15:30:00+05:30"'),
    end_datetime: z.string().describe('End date and time in ISO8601 format. Example: "2024-08-02T16:30:00+05:30"'),
    all_day: z.boolean().optional().describe('Set to true if this is an all-day event.'),
    description: z.string().optional().describe('Description of the event.'),
    venue: z.string().optional().describe('Venue where the event takes place. Maximum 255 characters.'),
    zip_code: z.string().optional().describe('Postal code of the venue.'),
    who_id: WhoIdInputSchema.optional().describe('Contact ID to associate with this event.'),
    what_id: WhatIdInputSchema.optional().describe('Related record (Account, Deal, Lead, etc.) ID and module.'),
    participants: z.array(ParticipantSchema).optional().describe('List of participants for the event.'),
    remind_at: z.string().optional().describe('Reminder date and time in ISO8601 format.'),
    tag: z.array(TagSchema).optional().describe('List of tags to associate with the event.'),
    send_notification: z.boolean().optional().describe('Set to true to send invitations to participants.'),
    latitude: z.number().optional().describe('Latitude of the event location.'),
    longitude: z.number().optional().describe('Longitude of the event location.')
});

const CreatedBySchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().email().optional()
});

const CreateResponseDetailsSchema = z.object({
    id: z.string(),
    Created_Time: z.string(),
    Modified_Time: z.string(),
    Created_By: CreatedBySchema.optional(),
    Modified_By: CreatedBySchema.optional()
});

const CreateResponseItemSchema = z.object({
    code: z.string(),
    details: CreateResponseDetailsSchema,
    message: z.string(),
    status: z.enum(['success', 'error'])
});

const CreateResponseSchema = z.object({
    data: z.array(CreateResponseItemSchema)
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().email().optional()
});

const ParticipantResponseSchema = z.object({
    Email: z.string().email().optional(),
    name: z.string().optional(),
    invited: z.boolean().optional(),
    id: z.string(),
    type: z.enum(['lead', 'contact', 'user', 'email']).optional(),
    participant: z.string().optional(),
    status: z.string().optional()
});

const WhatIdResponseSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const TagResponseSchema = z.object({
    name: z.string()
});

const EventSchema = z.object({
    id: z.string(),
    Event_Title: z.string(),
    Start_DateTime: z.string(),
    End_DateTime: z.string(),
    All_day: z.boolean().optional(),
    Description: z.string().nullable().optional(),
    Venue: z.string().nullable().optional(),
    ZIP_Code: z.string().nullable().optional(),
    Owner: OwnerSchema.optional(),
    Participants: z.array(ParticipantResponseSchema).optional(),
    Who_Id: WhatIdResponseSchema.nullable().optional(),
    What_Id: WhatIdResponseSchema.nullable().optional(),
    $se_module: z.string().nullable().optional(),
    Remind_At: z.string().nullable().optional(),
    Tag: z.array(TagResponseSchema).optional(),
    $send_notification: z.boolean().optional(),
    Latitude: z.number().nullable().optional(),
    Longitude: z.number().nullable().optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    $editable: z.boolean().optional()
});

const GetEventResponseSchema = z.object({
    data: z.array(EventSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('Unique ID of the created event.'),
    event_title: z.string().describe('Title of the event.'),
    start_datetime: z.string().describe('Start date and time in ISO8601 format.'),
    end_datetime: z.string().describe('End date and time in ISO8601 format.'),
    all_day: z.boolean().optional().describe('Whether this is an all-day event.'),
    description: z.string().optional().describe('Description of the event.'),
    venue: z.string().optional().describe('Venue of the event.'),
    zip_code: z.string().optional().describe('Postal code of the venue.'),
    owner_id: z.string().optional().describe('ID of the event owner.'),
    who_id: z.string().optional().describe('ID of the associated contact.'),
    what_id: z.string().optional().describe('ID of the related record (Account, Deal, Lead, etc.).'),
    what_module: z.string().optional().describe('Module name of the related record.'),
    remind_at: z.string().optional().describe('Reminder time in ISO8601 format.'),
    send_notification: z.boolean().optional().describe('Whether invitations were sent to participants.'),
    latitude: z.number().optional().describe('Latitude of the event location.'),
    longitude: z.number().optional().describe('Longitude of the event location.'),
    created_time: z.string().describe('Time when the event was created.'),
    modified_time: z.string().describe('Time when the event was last modified.')
});

const action = createAction({
    description: 'Create an event in Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-event',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.Events.CREATE', 'ZohoCRM.modules.Events.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            data: [
                {
                    Event_Title: input.event_title,
                    Start_DateTime: input.start_datetime,
                    End_DateTime: input.end_datetime,
                    ...(input.all_day !== undefined && { All_day: input.all_day }),
                    ...(input.description !== undefined && { Description: input.description }),
                    ...(input.venue !== undefined && { Venue: input.venue }),
                    ...(input.zip_code !== undefined && { ZIP_Code: input.zip_code }),
                    ...(input.who_id !== undefined && {
                        Who_Id: {
                            id: input.who_id.id
                        }
                    }),
                    ...(input.what_id !== undefined && {
                        What_Id: {
                            id: input.what_id.id
                        },
                        $se_module: input.what_id.module
                    }),
                    ...(input.participants !== undefined && {
                        Participants: input.participants.map((p) => ({
                            ...(p.Email !== undefined && { Email: p.Email }),
                            ...(p.name !== undefined && { name: p.name }),
                            ...(p.participant !== undefined && { participant: p.participant }),
                            ...(p.type !== undefined && { type: p.type }),
                            ...(p.invited !== undefined && { invited: p.invited })
                        }))
                    }),
                    ...(input.remind_at !== undefined && { Remind_At: input.remind_at }),
                    ...(input.tag !== undefined && {
                        Tag: input.tag.map((t) => ({ name: t.name }))
                    }),
                    ...(input.send_notification !== undefined && {
                        $send_notification: input.send_notification
                    }),
                    ...(input.latitude !== undefined && { Latitude: input.latitude }),
                    ...(input.longitude !== undefined && { Longitude: input.longitude })
                }
            ]
        };

        // https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
        const createResponse = await nango.post({
            endpoint: '/crm/v2/Events',
            data: requestBody,
            retries: 3
        });

        if (!createResponse.data || typeof createResponse.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho CRM API'
            });
        }

        const parsedCreateResponse = CreateResponseSchema.safeParse(createResponse.data);
        if (!parsedCreateResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho CRM create response',
                details: parsedCreateResponse.error.message
            });
        }

        const responseItems = parsedCreateResponse.data.data;
        const responseItem = responseItems[0];
        if (!responseItem) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No event was created'
            });
        }

        if (responseItem.status !== 'success') {
            throw new nango.ActionError({
                type: 'create_failed',
                message: responseItem.message,
                code: responseItem.code
            });
        }

        const eventId = responseItem.details.id;

        // Fetch the full event details to return complete data
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const getResponse = await nango.get({
            endpoint: `/crm/v2/Events/${eventId}`,
            retries: 3
        });

        if (!getResponse.data || typeof getResponse.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to fetch created event details'
            });
        }

        const parsedGetResponse = GetEventResponseSchema.safeParse(getResponse.data);
        if (!parsedGetResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse event details response',
                details: parsedGetResponse.error.message
            });
        }

        const events = parsedGetResponse.data.data;
        const event = events[0];
        if (!event) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Created event not found'
            });
        }

        const output: z.infer<typeof OutputSchema> = {
            id: event.id,
            event_title: event.Event_Title,
            start_datetime: event.Start_DateTime,
            end_datetime: event.End_DateTime,
            created_time: event.Created_Time || responseItem.details.Created_Time,
            modified_time: event.Modified_Time || responseItem.details.Modified_Time,
            ...(event.All_day !== undefined && { all_day: event.All_day }),
            ...(event.Description != null && { description: event.Description }),
            ...(event.Venue != null && { venue: event.Venue }),
            ...(event.ZIP_Code != null && { zip_code: event.ZIP_Code }),
            ...(event.Owner?.id !== undefined && { owner_id: event.Owner.id }),
            ...(event.Who_Id?.id !== undefined && { who_id: event.Who_Id.id }),
            ...(event.What_Id?.id !== undefined && { what_id: event.What_Id.id }),
            ...(event.$se_module != null && { what_module: event.$se_module }),
            ...(event.Remind_At != null && { remind_at: event.Remind_At }),
            ...(event.$send_notification !== undefined && {
                send_notification: event.$send_notification
            }),
            ...(event.Latitude != null && { latitude: event.Latitude }),
            ...(event.Longitude != null && { longitude: event.Longitude })
        };

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
