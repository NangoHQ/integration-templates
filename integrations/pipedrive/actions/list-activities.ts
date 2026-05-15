import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of activities to return per page. Default: 100, max: 500.'),
    filter_id: z.number().optional().describe('If supplied, only activities matching the specified filter are returned.'),
    user_id: z.number().optional().describe('If supplied, only activities owned by the specified user are returned.'),
    deal_id: z.number().optional().describe('If supplied, only activities linked to the specified deal are returned.'),
    person_id: z.number().optional().describe('If supplied, only activities whose primary participant is the given person are returned.'),
    org_id: z.number().optional().describe('If supplied, only activities linked to the specified organization are returned.'),
    done: z.boolean().optional().describe('If supplied, only activities with specified done flag value are returned.'),
    type: z.string().optional().describe('The type of the activity. Can be one type or multiple types separated by a comma.'),
    updated_since: z
        .string()
        .optional()
        .describe('If set, only activities with an update_time later than or equal to this time are returned. In RFC3339 format, e.g. 2025-01-01T10:20:00Z.'),
    updated_until: z
        .string()
        .optional()
        .describe('If set, only activities with an update_time earlier than this time are returned. In RFC3339 format, e.g. 2025-01-01T10:20:00Z.'),
    sort_by: z.string().optional().describe('The field to sort by. Supported fields: id, update_time, add_time, due_date. Default: id.'),
    sort_direction: z.string().optional().describe('The sorting direction. Supported values: asc, desc. Default: asc.')
});

const ProviderActivitySchema = z.object({
    id: z.number(),
    company_id: z.number().nullish(),
    user_id: z.number().nullish(),
    done: z.boolean().nullish(),
    type: z.string().nullish(),
    reference_type: z.string().nullish(),
    reference_id: z.number().nullish(),
    due_date: z.string().nullish(),
    due_time: z.string().nullish(),
    duration: z.string().nullish(),
    add_time: z.string().nullish(),
    marked_as_done_time: z.string().nullish(),
    subject: z.string().nullish(),
    deal_id: z.number().nullish(),
    org_id: z.number().nullish(),
    person_id: z.number().nullish(),
    location: z.string().nullish(),
    public_description: z.string().nullish(),
    note: z.string().nullish(),
    conference_meeting_client: z.string().nullish(),
    conference_meeting_id: z.string().nullish(),
    conference_meeting_url: z.string().nullish(),
    project_id: z.number().nullish(),
    active_flag: z.boolean().nullish(),
    update_time: z.string().nullish(),
    created_by_user_id: z.number().nullish(),
    location_postal_code: z.string().nullish(),
    location_country: z.string().nullish(),
    location_city: z.string().nullish(),
    location_address: z.string().nullish(),
    location_formatted_address: z.string().nullish(),
    attendees: z.array(z.object({}).passthrough()).nullish(),
    participants: z.array(z.object({}).passthrough()).nullish()
});

const ProviderAdditionalDataSchema = z.object({
    next_cursor: z.string().optional(),
    pagination: z
        .object({
            start: z.number().optional(),
            limit: z.number().optional(),
            more_items_in_collection: z.boolean().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderActivitySchema),
    additional_data: ProviderAdditionalDataSchema.optional()
});

const ActivityOutputSchema = z.object({
    id: z.number().describe('Activity ID'),
    subject: z.string().optional().describe('Subject of the activity'),
    type: z.string().optional().describe('Type of the activity'),
    done: z.boolean().optional().describe('Whether the activity is done'),
    due_date: z.string().optional().describe('Due date of the activity'),
    due_time: z.string().optional().describe('Due time of the activity'),
    duration: z.string().optional().describe('Duration of the activity'),
    user_id: z.number().optional().describe('ID of the user who owns the activity'),
    deal_id: z.number().optional().describe('ID of the deal linked to the activity'),
    person_id: z.number().optional().describe('ID of the person linked to the activity'),
    org_id: z.number().optional().describe('ID of the organization linked to the activity'),
    add_time: z.string().optional().describe('Time when the activity was added'),
    update_time: z.string().optional().describe('Time when the activity was last updated'),
    location: z.string().optional().describe('Location of the activity'),
    public_description: z.string().optional().describe('Public description of the activity'),
    note: z.string().optional().describe('Note of the activity')
});

const OutputSchema = z.object({
    activities: z.array(ActivityOutputSchema).describe('List of activities'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results')
});

const action = createAction({
    description: 'List activities from Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-activities',
        group: 'Activities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 100
        };

        if (input.cursor !== undefined && input.cursor !== '') {
            params['cursor'] = input.cursor;
        }
        if (input.filter_id !== undefined) {
            params['filter_id'] = input.filter_id;
        }
        if (input.user_id !== undefined) {
            params['user_id'] = input.user_id;
        }
        if (input.deal_id !== undefined) {
            params['deal_id'] = input.deal_id;
        }
        if (input.person_id !== undefined) {
            params['person_id'] = input.person_id;
        }
        if (input.org_id !== undefined) {
            params['org_id'] = input.org_id;
        }
        if (input.done !== undefined) {
            params['done'] = input.done ? '1' : '0';
        }
        if (input.type !== undefined) {
            params['type'] = input.type;
        }
        if (input.updated_since !== undefined) {
            params['updated_since'] = input.updated_since;
        }
        if (input.updated_until !== undefined) {
            params['updated_until'] = input.updated_until;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_direction !== undefined) {
            params['sort_direction'] = input.sort_direction;
        }

        // https://developers.pipedrive.com/docs/api/v1/Activities#getActivities
        const response = await nango.get({
            endpoint: '/v1/activities',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive API returned unsuccessful response'
            });
        }

        const activities = providerResponse.data.map((activity) => ({
            id: activity.id,
            ...(activity.subject != null && { subject: activity.subject }),
            ...(activity.type != null && { type: activity.type }),
            ...(activity.done != null && { done: activity.done }),
            ...(activity.due_date != null && { due_date: activity.due_date }),
            ...(activity.due_time != null && { due_time: activity.due_time }),
            ...(activity.duration != null && { duration: activity.duration }),
            ...(activity.user_id != null && { user_id: activity.user_id }),
            ...(activity.deal_id != null && { deal_id: activity.deal_id }),
            ...(activity.person_id != null && { person_id: activity.person_id }),
            ...(activity.org_id != null && { org_id: activity.org_id }),
            ...(activity.add_time != null && { add_time: activity.add_time }),
            ...(activity.update_time != null && { update_time: activity.update_time }),
            ...(activity.location != null && { location: activity.location }),
            ...(activity.public_description != null && { public_description: activity.public_description }),
            ...(activity.note != null && { note: activity.note })
        }));

        // Determine next_cursor from the response
        let next_cursor: string | undefined;
        if (providerResponse.additional_data) {
            // Check for cursor-based pagination first
            if (providerResponse.additional_data.next_cursor != null) {
                next_cursor = providerResponse.additional_data.next_cursor;
            } else if (providerResponse.additional_data.pagination?.more_items_in_collection) {
                // For offset-based pagination, calculate next start
                const currentStart = providerResponse.additional_data.pagination.start ?? 0;
                const currentLimit = providerResponse.additional_data.pagination.limit ?? 100;
                next_cursor = String(currentStart + currentLimit);
            }
        }

        return {
            activities,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
