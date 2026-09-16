import { z } from 'zod';
import { createAction } from 'nango';

/**
 * @tags: [read]
 * @tagReason: Reads incidents from the PagerDuty API.
 * @pitfalls: total is null unless total=true is requested. since/until bound created_at, not updated_at, so a date window does not surface status changes on older incidents.
 */
const action = createAction({
    description: 'List incidents, optionally filtered by service, team, user, status, urgency, or date range.',
    version: '1.0.0',
    input: z
        .object({
            cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
            limit: z.number().int().min(1).max(100).optional().describe('Maximum number of incidents to return per page.'),
            service_ids: z.array(z.string()).optional().describe('Filter by service IDs. Example: ["PZW5AR6"].'),
            team_ids: z.array(z.string()).optional().describe('Filter by team IDs. Example: ["PRVALT5"].'),
            user_ids: z.array(z.string()).optional().describe('Filter by user IDs. Example: ["PJB72P3"].'),
            statuses: z.array(z.string()).optional().describe('Filter by incident statuses. Allowed: triggered, acknowledged, resolved.'),
            urgencies: z.array(z.string()).optional().describe('Filter by urgency. Allowed: high, low.'),
            since: z.string().optional().describe('Start of date range to filter by created_at. ISO 8601 format. Example: "2024-01-01T00:00:00Z".'),
            until: z.string().optional().describe('End of date range to filter by created_at. ISO 8601 format. Example: "2024-12-31T23:59:59Z".'),
            date_range: z.string().optional().describe('Predefined date range alias. Example: "7_days".'),
            incident_key: z.string().optional().describe('Filter by incident deduplication key.'),
            time_zone: z.string().optional().describe('Time zone for date range boundaries. Example: "UTC".'),
            sort_by: z.string().optional().describe('Sort order. Example: "created_at:DESC".'),
            include: z.array(z.string()).optional().describe('Additional related data to include. Example: ["services","users"].'),
            total: z.boolean().optional().describe('Request total count in response. Slower; omit unless needed.')
        })
        .describe('Input parameters for listing PagerDuty incidents.'),
    output: z
        .object({
            incidents: z
                .array(
                    z
                        .object({
                            id: z.string().describe('Unique incident ID. Example: "Q0YLGGHWAI1DDT".'),
                            type: z.string().describe('Resource type. Always "incident".'),
                            summary: z.string().optional().describe('Human-readable summary of the incident.'),
                            self: z.string().optional().describe('API URL for this incident.'),
                            html_url: z.string().optional().describe('Web URL for this incident in PagerDuty.'),
                            incident_number: z.number().int().optional().describe('Account-scoped incident number.'),
                            title: z.string().optional().describe('Incident title.'),
                            description: z.string().optional().describe('Incident description.'),
                            created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
                            updated_at: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
                            status: z.string().optional().describe('Current status: triggered, acknowledged, or resolved.'),
                            incident_key: z.string().optional().describe('Deduplication key.'),
                            service: z
                                .object({
                                    id: z.string().describe('Service ID.'),
                                    type: z.string().describe('Resource type.'),
                                    summary: z.string().optional().describe('Human-readable summary.'),
                                    self: z.string().nullable().optional().describe('API URL.'),
                                    html_url: z.string().nullable().optional().describe('Web URL.')
                                })
                                .nullable()
                                .optional()
                                .describe('Service associated with the incident.'),
                            priority: z
                                .object({
                                    id: z.string().describe('Priority ID.'),
                                    type: z.string().describe('Resource type.'),
                                    summary: z.string().optional().describe('Human-readable summary.'),
                                    self: z.string().nullable().optional().describe('API URL.'),
                                    html_url: z.string().nullable().optional().describe('Web URL.')
                                })
                                .nullable()
                                .optional()
                                .describe('Priority assigned to the incident.'),
                            urgency: z.string().optional().describe('Incident urgency: high or low.'),
                            assignments: z
                                .array(
                                    z.object({
                                        at: z.string().optional().describe('Assignment timestamp.'),
                                        assignee: z
                                            .object({
                                                id: z.string().describe('Assignee ID.'),
                                                type: z.string().describe('Resource type.'),
                                                summary: z.string().optional().describe('Human-readable summary.'),
                                                self: z.string().nullable().optional().describe('API URL.'),
                                                html_url: z.string().nullable().optional().describe('Web URL.')
                                            })
                                            .nullable()
                                            .optional()
                                            .describe('Assigned user or team.')
                                    })
                                )
                                .optional()
                                .describe('Current assignees.'),
                            acknowledgements: z
                                .array(
                                    z.object({
                                        at: z.string().optional().describe('Acknowledgement timestamp.'),
                                        acknowledger: z
                                            .object({
                                                id: z.string().describe('Acknowledger ID.'),
                                                type: z.string().describe('Resource type.'),
                                                summary: z.string().optional().describe('Human-readable summary.'),
                                                self: z.string().nullable().optional().describe('API URL.'),
                                                html_url: z.string().nullable().optional().describe('Web URL.')
                                            })
                                            .nullable()
                                            .optional()
                                            .describe('User who acknowledged.')
                                    })
                                )
                                .optional()
                                .describe('Users who acknowledged the incident.'),
                            last_status_change_at: z.string().optional().describe('Timestamp of the last status change.'),
                            last_status_change_by: z
                                .object({
                                    id: z.string().describe('Actor ID.'),
                                    type: z.string().describe('Resource type.'),
                                    summary: z.string().optional().describe('Human-readable summary.'),
                                    self: z.string().nullable().optional().describe('API URL.'),
                                    html_url: z.string().nullable().optional().describe('Web URL.')
                                })
                                .nullable()
                                .optional()
                                .describe('User or service that made the last status change.'),
                            resolved_at: z.string().nullable().optional().describe('Resolution timestamp, null if unresolved.'),
                            escalations: z
                                .array(
                                    z.object({
                                        id: z.string().describe('Escalation policy ID.'),
                                        type: z.string().describe('Resource type.'),
                                        summary: z.string().optional().describe('Human-readable summary.'),
                                        self: z.string().optional().describe('API URL.'),
                                        html_url: z.string().optional().describe('Web URL.')
                                    })
                                )
                                .optional()
                                .describe('Escalation policies applied to the incident.'),
                            teams: z
                                .array(
                                    z.object({
                                        id: z.string().describe('Team ID.'),
                                        type: z.string().describe('Resource type.'),
                                        summary: z.string().optional().describe('Human-readable summary.'),
                                        self: z.string().optional().describe('API URL.'),
                                        html_url: z.string().optional().describe('Web URL.')
                                    })
                                )
                                .optional()
                                .describe('Teams associated with the incident.'),
                            alert_counts: z
                                .object({
                                    all: z.number().int().optional().describe('Total alert count.'),
                                    triggered: z.number().int().optional().describe('Triggered alert count.'),
                                    resolved: z.number().int().optional().describe('Resolved alert count.')
                                })
                                .optional()
                                .describe('Alert counts for this incident.'),
                            body: z
                                .object({
                                    type: z.string().optional().describe('Body type.'),
                                    details: z.string().optional().describe('Body details text.')
                                })
                                .optional()
                                .describe('Incident body/details.')
                        })
                        .describe('A PagerDuty incident.')
                )
                .describe('List of incidents matching the filters.'),
            next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omitted when there are no more pages.'),
            limit: z.number().int().describe('Limit applied to this request.'),
            offset: z.number().int().describe('Offset applied to this request.'),
            total: z.number().int().nullable().optional().describe('Total number of matching incidents. Null unless total=true was requested.')
        })
        .describe('Output from listing PagerDuty incidents.'),
    scopes: ['incidents.read'],

    exec: async (nango, input) => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric offset string'
            });
        }

        // PagerDuty requires array-valued filters as repeated bracketed keys, e.g.
        // service_ids[]=A&service_ids[]=B. ProxyConfiguration.params only accepts
        // string | Record<string, string | number>, so array values can't be passed
        // through the params object (the proxy would collapse them into a single
        // comma-joined value, which PagerDuty rejects/ignores). Build the query string
        // manually instead and pass it as a raw string.
        const searchParams = new URLSearchParams();
        searchParams.set('limit', String(input.limit ?? 25));
        searchParams.set('offset', String(offset));

        if (input.service_ids !== undefined && input.service_ids.length > 0) {
            for (const id of input.service_ids) {
                searchParams.append('service_ids[]', id);
            }
        }
        if (input.team_ids !== undefined && input.team_ids.length > 0) {
            for (const id of input.team_ids) {
                searchParams.append('team_ids[]', id);
            }
        }
        if (input.user_ids !== undefined && input.user_ids.length > 0) {
            for (const id of input.user_ids) {
                searchParams.append('user_ids[]', id);
            }
        }
        if (input.statuses !== undefined && input.statuses.length > 0) {
            for (const status of input.statuses) {
                searchParams.append('statuses[]', status);
            }
        }
        if (input.urgencies !== undefined && input.urgencies.length > 0) {
            for (const urgency of input.urgencies) {
                searchParams.append('urgencies[]', urgency);
            }
        }
        if (input.since !== undefined) {
            searchParams.set('since', input.since);
        }
        if (input.until !== undefined) {
            searchParams.set('until', input.until);
        }
        if (input.date_range !== undefined) {
            searchParams.set('date_range', input.date_range);
        }
        if (input.incident_key !== undefined) {
            searchParams.set('incident_key', input.incident_key);
        }
        if (input.time_zone !== undefined) {
            searchParams.set('time_zone', input.time_zone);
        }
        if (input.sort_by !== undefined) {
            searchParams.set('sort_by', input.sort_by);
        }
        if (input.include !== undefined && input.include.length > 0) {
            for (const inc of input.include) {
                searchParams.append('include[]', inc);
            }
        }
        if (input.total !== undefined) {
            searchParams.set('total', input.total ? 'true' : 'false');
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/b3A6Mjc0ODEwMg-list-incidents
            endpoint: '/incidents',
            params: searchParams.toString(),
            retries: 3
        });

        const providerEnvelopeSchema = z.object({
            incidents: z.array(z.unknown()),
            limit: z.number().int(),
            offset: z.number().int(),
            total: z.number().int().nullable().optional(),
            more: z.boolean()
        });

        const envelope = providerEnvelopeSchema.parse(response.data);

        const referenceSchema = z.object({
            id: z.string(),
            type: z.string(),
            summary: z.string().nullable().optional(),
            self: z.string().nullable().optional(),
            html_url: z.string().nullable().optional()
        });

        const providerIncidentSchema = z.object({
            id: z.string(),
            type: z.string(),
            summary: z.string().nullable().optional(),
            self: z.string().nullable().optional(),
            html_url: z.string().nullable().optional(),
            incident_number: z.number().int().optional(),
            title: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            created_at: z.string().nullable().optional(),
            updated_at: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            incident_key: z.string().nullable().optional(),
            service: referenceSchema.nullable().optional(),
            priority: referenceSchema.nullable().optional(),
            urgency: z.string().nullable().optional(),
            assignments: z
                .array(
                    z.object({
                        at: z.string().nullable().optional(),
                        assignee: referenceSchema.nullable().optional()
                    })
                )
                .optional(),
            acknowledgements: z
                .array(
                    z.object({
                        at: z.string().nullable().optional(),
                        acknowledger: referenceSchema.nullable().optional()
                    })
                )
                .optional(),
            last_status_change_at: z.string().nullable().optional(),
            last_status_change_by: referenceSchema.nullable().optional(),
            resolved_at: z.string().nullable().optional(),
            escalations: z.array(referenceSchema).optional(),
            teams: z.array(referenceSchema).optional(),
            alert_counts: z
                .object({
                    all: z.number().int().optional(),
                    triggered: z.number().int().optional(),
                    resolved: z.number().int().optional()
                })
                .optional(),
            body: z
                .object({
                    type: z.string().nullable().optional(),
                    details: z.string().nullable().optional()
                })
                .nullable()
                .optional()
        });

        const mapReference = (ref: z.infer<typeof referenceSchema>) => ({
            id: ref.id,
            type: ref.type,
            ...(ref.summary != null && { summary: ref.summary }),
            ...(ref.self != null && { self: ref.self }),
            ...(ref.html_url != null && { html_url: ref.html_url })
        });

        const incidents = envelope.incidents.map((raw) => {
            const item = providerIncidentSchema.parse(raw);
            return {
                id: item.id,
                type: item.type,
                ...(item.summary != null && { summary: item.summary }),
                ...(item.self != null && { self: item.self }),
                ...(item.html_url != null && { html_url: item.html_url }),
                ...(item.incident_number != null && { incident_number: item.incident_number }),
                ...(item.title != null && { title: item.title }),
                ...(item.description != null && { description: item.description }),
                ...(item.created_at != null && { created_at: item.created_at }),
                ...(item.updated_at != null && { updated_at: item.updated_at }),
                ...(item.status != null && { status: item.status }),
                ...(item.incident_key != null && { incident_key: item.incident_key }),
                ...(item.service != null && { service: mapReference(item.service) }),
                ...(item.priority != null && { priority: mapReference(item.priority) }),
                ...(item.urgency != null && { urgency: item.urgency }),
                ...(item.assignments != null && {
                    assignments: item.assignments.map((a) => ({
                        ...(a.at != null && { at: a.at }),
                        ...(a.assignee != null && { assignee: mapReference(a.assignee) })
                    }))
                }),
                ...(item.acknowledgements != null && {
                    acknowledgements: item.acknowledgements.map((a) => ({
                        ...(a.at != null && { at: a.at }),
                        ...(a.acknowledger != null && { acknowledger: mapReference(a.acknowledger) })
                    }))
                }),
                ...(item.last_status_change_at != null && { last_status_change_at: item.last_status_change_at }),
                ...(item.last_status_change_by != null && { last_status_change_by: mapReference(item.last_status_change_by) }),
                ...(item.resolved_at !== undefined && { resolved_at: item.resolved_at }),
                ...(item.escalations != null && { escalations: item.escalations.map(mapReference) }),
                ...(item.teams != null && { teams: item.teams.map(mapReference) }),
                ...(item.alert_counts != null && { alert_counts: item.alert_counts }),
                ...(item.body != null && {
                    body: {
                        ...(item.body.type != null && { type: item.body.type }),
                        ...(item.body.details != null && { details: item.body.details })
                    }
                })
            };
        });

        const nextOffset = envelope.offset + envelope.limit;
        const nextCursor = envelope.more ? String(nextOffset) : undefined;

        return {
            incidents: incidents,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            limit: envelope.limit,
            offset: envelope.offset,
            ...(envelope.total !== undefined && { total: envelope.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
