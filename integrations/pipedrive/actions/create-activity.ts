import { z } from 'zod';
import { createAction } from 'nango';

const LocationSchema = z
    .object({
        value: z.string().optional().describe('The full address of the activity'),
        country: z.string().optional().describe('Country of the activity'),
        admin_area_level_1: z.string().optional().describe('Admin area level 1 (e.g. state) of the activity'),
        admin_area_level_2: z.string().optional().describe('Admin area level 2 (e.g. county) of the activity'),
        locality: z.string().optional().describe('Locality (e.g. city) of the activity'),
        sublocality: z.string().optional().describe('Sublocality (e.g. neighborhood) of the activity'),
        route: z.string().optional().describe('Route (e.g. street) of the activity'),
        street_number: z.string().optional().describe('Street number of the activity'),
        subpremise: z.string().optional().describe('Subpremise (e.g. apartment/suite number) of the activity'),
        postal_code: z.string().optional().describe('Postal code of the activity')
    })
    .optional();

const ParticipantSchema = z.object({
    person_id: z.number().describe('The ID of the person'),
    primary: z.boolean().optional().describe('Whether the person is the primary participant or not')
});

const AttendeeSchema = z.object({
    email: z.string().describe('The email address of the attendee'),
    name: z.string().optional().describe('The name of the attendee'),
    status: z.string().optional().describe('The status of the attendee'),
    is_organizer: z.boolean().optional().describe('Whether the attendee is the organizer or not'),
    person_id: z.number().optional().describe('The ID of the person if the attendee has a person record'),
    user_id: z.number().optional().describe('The ID of the user if the attendee is a user')
});

const InputSchema = z.object({
    subject: z.string().describe('The subject of the activity. Example: "Discuss revenue with John"'),
    type: z.string().describe('The type of the activity. Example: "call", "meeting", "lunch". Use ActivityTypes API to get available types.'),
    owner_id: z.number().optional().describe('The ID of the user who owns the activity. Example: 12345'),
    deal_id: z.number().optional().describe('The ID of the deal linked to the activity. Example: 98765'),
    lead_id: z.string().optional().describe('The ID of the lead linked to the activity. Example: "a1b2c3d4e5f6"'),
    person_id: z.number().optional().describe('The ID of the person linked to the activity. Example: 56789'),
    org_id: z.number().optional().describe('The ID of the organization linked to the activity. Example: 34567'),
    project_id: z.number().optional().describe('The ID of the project linked to the activity. Example: 11122'),
    due_date: z.string().optional().describe('The due date of the activity in YYYY-MM-DD format. Example: "2025-05-15"'),
    due_time: z.string().optional().describe('The due time of the activity in HH:MM format. Example: "14:30"'),
    duration: z.string().optional().describe('The duration of the activity in HH:MM format. Example: "01:00"'),
    busy: z.boolean().optional().describe('Whether the activity marks the assignee as busy or not in their calendar'),
    done: z.boolean().optional().describe('Whether the activity is marked as done or not'),
    location: LocationSchema,
    participants: z.array(ParticipantSchema).optional().describe('The participants of the activity'),
    attendees: z.array(AttendeeSchema).optional().describe('The attendees of the activity'),
    public_description: z.string().optional().describe('The public description of the activity that will be synced to external calendar'),
    priority: z.number().optional().describe('The priority of the activity. Mappable to a specific string using activityFields API. Example: 1'),
    note: z.string().optional().describe('The note of the activity')
});

const ProviderActivitySchema = z.object({
    id: z.number(),
    company_id: z.number().optional(),
    user_id: z.number().optional(),
    done: z.boolean().optional(),
    type: z.string().optional(),
    reference_type: z.string().optional().nullable(),
    reference_id: z.number().optional().nullable(),
    due_date: z.string().optional().nullable(),
    due_time: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    busy_flag: z.boolean().optional(),
    add_time: z.string().optional(),
    marked_as_done_time: z.string().optional().nullable(),
    subject: z.string().optional().nullable(),
    public_description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    location_country: z.string().optional().nullable(),
    location_locality: z.string().optional().nullable(),
    location_admin_area_level: z.string().optional().nullable(),
    location_sub_locality: z.string().optional().nullable(),
    location_route: z.string().optional().nullable(),
    location_street_number: z.string().optional().nullable(),
    fields: z.array(z.unknown()).optional().nullable(),
    org_id: z.number().optional().nullable(),
    person_id: z.number().optional().nullable(),
    deal_id: z.number().optional().nullable(),
    lead_id: z.string().optional().nullable(),
    project_id: z.number().optional().nullable(),
    active_flag: z.boolean().optional(),
    update_time: z.string().optional().nullable(),
    update_user_id: z.number().optional().nullable(),
    participants: z.array(z.unknown()).optional().nullable(),
    attendees: z.array(z.unknown()).optional().nullable(),
    assigned_to_user: z.unknown().optional().nullable(),
    note: z.string().optional().nullable(),
    notification_language_id: z.number().optional().nullable(),
    priority: z.number().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number().describe('The ID of the created activity'),
    subject: z.string().optional().describe('The subject of the activity'),
    type: z.string().optional().describe('The type of the activity'),
    done: z.boolean().optional().describe('Whether the activity is marked as done'),
    due_date: z.string().optional().describe('The due date of the activity'),
    due_time: z.string().optional().describe('The due time of the activity'),
    duration: z.string().optional().describe('The duration of the activity'),
    busy_flag: z.boolean().optional().describe('Whether the activity marks the assignee as busy'),
    owner_id: z.number().optional().describe('The ID of the user who owns the activity'),
    deal_id: z.number().optional().describe('The ID of the deal linked to the activity'),
    lead_id: z.string().optional().describe('The ID of the lead linked to the activity'),
    person_id: z.number().optional().describe('The ID of the person linked to the activity'),
    org_id: z.number().optional().describe('The ID of the organization linked to the activity'),
    project_id: z.number().optional().describe('The ID of the project linked to the activity'),
    public_description: z.string().optional().describe('The public description of the activity'),
    priority: z.number().optional().describe('The priority of the activity'),
    note: z.string().optional().describe('The note of the activity'),
    location: z.string().optional().describe('The location of the activity'),
    add_time: z.string().optional().describe('The time when the activity was created')
});

const action = createAction({
    description: 'Create a new activity in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activities:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            subject: input.subject,
            type: input.type
        };

        if (input.owner_id !== undefined) {
            requestBody['user_id'] = input.owner_id;
        }
        if (input.deal_id !== undefined) {
            requestBody['deal_id'] = input.deal_id;
        }
        if (input.lead_id !== undefined) {
            requestBody['lead_id'] = input.lead_id;
        }
        if (input.person_id !== undefined) {
            requestBody['person_id'] = input.person_id;
        }
        if (input.org_id !== undefined) {
            requestBody['org_id'] = input.org_id;
        }
        if (input.project_id !== undefined) {
            requestBody['project_id'] = input.project_id;
        }
        if (input.due_date !== undefined) {
            requestBody['due_date'] = input.due_date;
        }
        if (input.due_time !== undefined) {
            requestBody['due_time'] = input.due_time;
        }
        if (input.duration !== undefined) {
            requestBody['duration'] = input.duration;
        }
        if (input.busy !== undefined) {
            requestBody['busy'] = input.busy;
        }
        if (input.done !== undefined) {
            requestBody['done'] = input.done;
        }
        if (input.location !== undefined && input.location !== null) {
            requestBody['location'] = input.location;
        }
        if (input.participants !== undefined) {
            requestBody['participants'] = input.participants;
        }
        if (input.attendees !== undefined) {
            requestBody['attendees'] = input.attendees;
        }
        if (input.public_description !== undefined) {
            requestBody['public_description'] = input.public_description;
        }
        if (input.priority !== undefined) {
            requestBody['priority'] = input.priority;
        }
        if (input.note !== undefined) {
            requestBody['note'] = input.note;
        }

        // https://developers.pipedrive.com/docs/api/v1/Activities#addActivity
        const response = await nango.post({
            endpoint: '/v1/activities',
            data: requestBody,
            retries: 10
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Pipedrive API'
            });
        }

        const activity = ProviderActivitySchema.parse(response.data.data);

        return {
            id: activity.id,
            subject: activity.subject ?? undefined,
            type: activity.type ?? undefined,
            done: activity.done ?? undefined,
            due_date: activity.due_date ?? undefined,
            due_time: activity.due_time ?? undefined,
            duration: activity.duration ?? undefined,
            busy_flag: activity.busy_flag ?? undefined,
            owner_id: activity.user_id ?? undefined,
            deal_id: activity.deal_id ?? undefined,
            lead_id: activity.lead_id ?? undefined,
            person_id: activity.person_id ?? undefined,
            org_id: activity.org_id ?? undefined,
            project_id: activity.project_id ?? undefined,
            public_description: activity.public_description ?? undefined,
            priority: activity.priority ?? undefined,
            note: activity.note ?? undefined,
            location: activity.location ?? undefined,
            add_time: activity.add_time ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
