import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter_id: z.number().optional().describe('Filter ID to apply. Only organizations matching the filter are returned.'),
    ids: z.string().optional().describe('Comma-separated string of up to 100 organization IDs to fetch. Ignored if filter_id is provided.'),
    owner_id: z.number().optional().describe('Owner user ID. Only organizations owned by this user are returned. Ignored if filter_id is provided.'),
    updated_since: z
        .string()
        .optional()
        .describe('RFC3339 timestamp. Only organizations with update_time later than or equal to this are returned. Example: 2025-01-01T10:20:00Z'),
    updated_until: z
        .string()
        .optional()
        .describe('RFC3339 timestamp. Only organizations with update_time earlier than this are returned. Example: 2025-01-01T10:20:00Z'),
    sort_by: z.enum(['id', 'update_time', 'add_time']).optional().describe('Field to sort by. Default: id'),
    sort_direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Default: asc'),
    include_fields: z
        .string()
        .optional()
        .describe('Comma-separated additional fields to include (e.g., next_activity_id, last_activity_id, open_deals_count).'),
    custom_fields: z.string().optional().describe('Comma-separated custom field keys to include. Maximum 15 keys.'),
    include_option_labels: z.boolean().optional().describe('When true, option custom fields return { id, label } objects instead of plain IDs.'),
    include_labels: z.boolean().optional().describe('When true, response includes an array of label objects as { id, label }.'),
    limit: z.number().optional().describe('Number of items to return per page. Default: 100, Maximum: 500.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LabelSchema = z.object({
    id: z.number(),
    label: z.string()
});

const OrganizationSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        owner_id: z.unknown().optional(),
        add_time: z.string().optional(),
        update_time: z.string().optional(),
        visible_to: z.unknown().optional(),
        label_ids: z.array(z.number()).optional(),
        labels: z.array(LabelSchema).optional(),
        address: z.unknown().optional(),
        people_count: z.number().optional(),
        open_deals_count: z.number().optional(),
        closed_deals_count: z.number().optional(),
        won_deals_count: z.number().optional(),
        lost_deals_count: z.number().optional(),
        next_activity_id: z.unknown().optional(),
        last_activity_id: z.unknown().optional(),
        activities_count: z.number().optional(),
        done_activities_count: z.number().optional(),
        undone_activities_count: z.number().optional(),
        email_messages_count: z.number().optional(),
        files_count: z.number().optional(),
        notes_count: z.number().optional(),
        followers_count: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    organizations: z.array(OrganizationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List organizations from Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.filter_id !== undefined) params['filter_id'] = input.filter_id;
        if (input.ids !== undefined) params['ids'] = input.ids;
        if (input.owner_id !== undefined) params['owner_id'] = input.owner_id;
        if (input.updated_since !== undefined) params['updated_since'] = input.updated_since;
        if (input.updated_until !== undefined) params['updated_until'] = input.updated_until;
        if (input.sort_by !== undefined) params['sort_by'] = input.sort_by;
        if (input.sort_direction !== undefined) params['sort_direction'] = input.sort_direction;
        if (input.include_fields !== undefined) params['include_fields'] = input.include_fields;
        if (input.custom_fields !== undefined) params['custom_fields'] = input.custom_fields;
        if (input.include_option_labels !== undefined) params['include_option_labels'] = input.include_option_labels ? 'true' : 'false';
        if (input.include_labels !== undefined) params['include_labels'] = input.include_labels ? 'true' : 'false';
        if (input.limit !== undefined) params['limit'] = input.limit;
        if (input.cursor !== undefined) params['cursor'] = input.cursor;

        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Organizations#getOrganizations
            endpoint: '/v1/organizations',
            params,
            retries: 3
        });

        if (!response.data?.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive API returned an unsuccessful response'
            });
        }

        const organizations = response.data.data || [];
        const nextCursor = response.data.additional_data?.next_cursor;

        return {
            organizations,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
