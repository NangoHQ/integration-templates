import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the `start` parameter in the Pipedrive API.'),
    limit: z.number().int().min(1).max(500).optional().describe('Number of leads to return per page. Default is 100, maximum is 500.'),
    owner_id: z.number().int().optional().describe('If supplied, only leads matching the given user will be returned.'),
    person_id: z.number().int().optional().describe('If supplied, only leads matching the given person will be returned.'),
    organization_id: z.number().int().optional().describe('If supplied, only leads matching the given organization will be returned.'),
    filter_id: z.number().int().optional().describe('The ID of the filter to use.'),
    updated_since: z
        .string()
        .optional()
        .describe('If set, only leads with an update_time later than or equal to this time are returned. In ISO 8601 format, e.g., 2025-01-01T10:20:00Z.'),
    sort: z
        .string()
        .optional()
        .describe(
            'The field names and sorting mode separated by a comma (e.g., `add_time ASC`, `update_time DESC`). Only first-level field keys are supported.'
        )
});

const LeadSchema = z.object({
    id: z.string().describe('The unique ID of the lead.'),
    title: z.string().describe('The title of the lead.'),
    owner_id: z.number().nullable().optional().describe('The ID of the user who owns the lead.'),
    person_id: z.number().nullable().optional().describe('The ID of the person the lead is associated with.'),
    organization_id: z.number().nullable().optional().describe('The ID of the organization the lead is associated with.'),
    add_time: z.string().optional().describe('The date and time the lead was created.'),
    update_time: z.string().optional().describe('The date and time the lead was last updated.'),
    was_seen: z.boolean().optional().describe('Whether the lead has been seen.'),
    expected_close_date: z.string().nullable().optional().describe('The expected close date of the lead.'),
    next_activity_id: z.number().nullable().optional().describe('The ID of the next activity associated with the lead.'),
    source_name: z.string().nullable().optional().describe('The source name of the lead.'),
    label_ids: z.array(z.string()).optional().describe('The IDs of labels attached to the lead.')
});

const OutputSchema = z.object({
    leads: z.array(LeadSchema).describe('The list of leads.'),
    next_cursor: z.string().optional().describe('The cursor for the next page of results. Null if there are no more results.')
});

const action = createAction({
    description: 'List leads from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-leads',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Leads#getLeads
        const response = await nango.get({
            endpoint: '/v1/leads',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
                ...(input.person_id !== undefined && { person_id: input.person_id }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.filter_id !== undefined && { filter_id: input.filter_id }),
                ...(input.updated_since !== undefined && { updated_since: input.updated_since }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const data = response.data;

        if (!data || !data.success || !data.data) {
            return {
                leads: []
            };
        }

        const leads = data.data
            .map((lead: unknown) => {
                const parsedLead = LeadSchema.safeParse(lead);
                if (parsedLead.success) {
                    return parsedLead.data;
                }
                return null;
            })
            .filter((lead: { id: string; title: string } | null): lead is { id: string; title: string } => lead !== null);

        const nextCursor = data.pagination?.next_start?.toString();

        return {
            leads: leads,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
