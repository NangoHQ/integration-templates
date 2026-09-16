import { z } from 'zod';
import { createAction } from 'nango';

const ProviderReferenceSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullable().optional(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional()
    })
    .passthrough();

const ProviderMaintenanceWindowSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullable().optional(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional(),
        start_time: z.string().nullable().optional(),
        end_time: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        sequence_number: z.number().int().nullable().optional(),
        services: z.array(ProviderReferenceSchema).nullable().optional(),
        teams: z.array(ProviderReferenceSchema).nullable().optional(),
        created_by: ProviderReferenceSchema.nullable().optional()
    })
    .passthrough();

const ReferenceSchema = z.object({
    id: z.string().describe('Unique identifier of the referenced resource.'),
    type: z.string().describe('Type of the referenced resource, e.g. "service_reference" or "team_reference".'),
    summary: z.string().optional().describe('Short summary or name of the referenced resource.'),
    self: z.string().optional().describe('API URL of the referenced resource.'),
    html_url: z.string().optional().describe('URL to the referenced resource in the PagerDuty web interface.')
});

const MaintenanceWindowSchema = z.object({
    id: z.string().describe('Unique identifier for the maintenance window.'),
    type: z.string().describe('The type of resource. Always "maintenance_window" for this resource.'),
    summary: z.string().optional().describe('A short summary of the maintenance window.'),
    self: z.string().optional().describe('The API URL of the maintenance window resource.'),
    html_url: z.string().optional().describe('The URL to the maintenance window in the PagerDuty web interface.'),
    start_time: z.string().optional().describe('The start time of the maintenance window in ISO 8601 format.'),
    end_time: z.string().optional().describe('The end time of the maintenance window in ISO 8601 format.'),
    description: z.string().optional().describe('A detailed description of the maintenance window.'),
    status: z.string().optional().describe('The current status of the maintenance window, such as "ongoing", "upcoming", or "completed".'),
    sequence_number: z.number().int().optional().describe('The sequence number of the maintenance window.'),
    services: z.array(ReferenceSchema).optional().describe('Services affected by this maintenance window.'),
    teams: z.array(ReferenceSchema).optional().describe('Teams associated with this maintenance window.'),
    created_by: ReferenceSchema.optional().describe('The user who created this maintenance window.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of maintenance windows to return per page.'),
        query: z.string().optional().describe('A search query to filter maintenance windows by summary or description.'),
        filter: z.string().optional().describe('Filter by maintenance window status: "past", "future", or "open". Omit to return all.'),
        service_ids: z.array(z.string()).optional().describe('Filter by service IDs. Only maintenance windows affecting these services are returned.'),
        team_ids: z.array(z.string()).optional().describe('Filter by team IDs. Only maintenance windows affecting these teams are returned.'),
        include: z.array(z.string()).optional().describe('Additional related objects to include in the response, such as "services" or "teams".'),
        total: z.boolean().optional().describe('Whether to include the total count in the response. Defaults to false for faster response times.')
    })
    .describe('Input for listing maintenance windows.');

const OutputSchema = z
    .object({
        maintenance_windows: z.array(MaintenanceWindowSchema).describe('Array of maintenance windows matching the query.'),
        next_cursor: z.string().optional().describe('Pagination cursor to fetch the next page. Omit when there are no more pages.')
    })
    .describe('Output containing a list of maintenance windows and an optional next page cursor.');

const ProviderEnvelopeSchema = z.object({
    maintenance_windows: z.array(z.unknown()),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    total: z.number().int().nullable().optional(),
    more: z.boolean().optional()
});

function normalizeReference(ref: z.infer<typeof ProviderReferenceSchema>) {
    return {
        id: ref.id,
        type: ref.type,
        summary: ref.summary ?? undefined,
        self: ref.self ?? undefined,
        html_url: ref.html_url ?? undefined
    };
}

function normalizeMaintenanceWindow(item: z.infer<typeof ProviderMaintenanceWindowSchema>) {
    return {
        id: item.id,
        type: item.type,
        summary: item.summary ?? undefined,
        self: item.self ?? undefined,
        html_url: item.html_url ?? undefined,
        start_time: item.start_time ?? undefined,
        end_time: item.end_time ?? undefined,
        description: item.description ?? undefined,
        status: item.status ?? undefined,
        sequence_number: item.sequence_number ?? undefined,
        services: item.services !== undefined && item.services !== null ? item.services.map(normalizeReference) : undefined,
        teams: item.teams !== undefined && item.teams !== null ? item.teams.map(normalizeReference) : undefined,
        created_by: item.created_by !== undefined && item.created_by !== null ? normalizeReference(item.created_by) : undefined
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads maintenance windows from the PagerDuty API.
 * @pitfalls: The action output does not include a total count even when total: true is passed; the provider defaults to null totals for speed and the action does not surface the field.
 */
const action = createAction({
    description: 'List maintenance windows, optionally filtered by service or team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string'
            });
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/maintenance_windows',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.service_ids !== undefined && input.service_ids.length > 0 && { 'service_ids[]': input.service_ids }),
                ...(input.team_ids !== undefined && input.team_ids.length > 0 && { 'team_ids[]': input.team_ids }),
                ...(input.include !== undefined && input.include.length > 0 && { 'include[]': input.include }),
                ...(input.total !== undefined && { total: String(input.total) })
            },
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.parse(response.data);
        const maintenanceWindows = envelope.maintenance_windows.map((item: unknown) => {
            return normalizeMaintenanceWindow(ProviderMaintenanceWindowSchema.parse(item));
        });

        return {
            maintenance_windows: maintenanceWindows,
            ...(envelope.more === true &&
                envelope.offset !== undefined &&
                envelope.limit !== undefined && {
                    next_cursor: String(envelope.offset + envelope.limit)
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
