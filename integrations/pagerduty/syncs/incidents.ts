import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

function present<T>(value: T | null | undefined): value is T {
    return value !== undefined && value !== null;
}

const ProviderReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullish(),
    self: z.string().nullish(),
    html_url: z.string().nullish()
});

const ProviderIncidentSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullish(),
    self: z.string().nullish(),
    html_url: z.string().nullish(),
    incident_number: z.number().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    resolved_at: z.string().nullish(),
    incident_key: z.string().nullish(),
    urgency: z.string().nullish(),
    service: ProviderReferenceSchema.nullish(),
    priority: ProviderReferenceSchema.nullish(),
    escalation_policy: ProviderReferenceSchema.nullish(),
    teams: z.array(ProviderReferenceSchema).nullish(),
    assignments: z
        .array(
            z.object({
                at: z.string().nullish(),
                assignee: ProviderReferenceSchema.nullish()
            })
        )
        .nullish(),
    acknowledgements: z
        .array(
            z.object({
                at: z.string().nullish(),
                acknowledger: ProviderReferenceSchema.nullish()
            })
        )
        .nullish(),
    last_status_change_at: z.string().nullish(),
    last_status_change_by: ProviderReferenceSchema.nullish(),
    alert_counts: z
        .object({
            all: z.number().nullish(),
            triggered: z.number().nullish(),
            resolved: z.number().nullish()
        })
        .nullish(),
    body: z
        .object({
            type: z.string().nullish(),
            details: z.string().nullish()
        })
        .nullish()
});

const CheckpointSchema = z
    .object({
        since: z.string(),
        last_full_refresh_at: z.string()
    })
    .describe('Sync checkpoint tracking the last incremental window and the last full-refresh time.');

const IncidentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the incident.'),
        type: z.string().describe('Type of the PagerDuty resource; always "incident" for incidents.'),
        summary: z.string().optional().describe('A short summary of the incident.'),
        self: z.string().optional().describe('The API URL to access the incident.'),
        html_url: z.string().optional().describe('The web URL to view the incident in PagerDuty.'),
        incident_number: z.number().optional().describe('The human-readable incident number.'),
        title: z.string().optional().describe('The title of the incident.'),
        description: z.string().optional().describe('Description of the incident.'),
        status: z.string().optional().describe('Current status of the incident: triggered, acknowledged, or resolved.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the incident was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the incident was last updated.'),
        resolved_at: z.string().optional().describe('ISO 8601 timestamp when the incident was resolved.'),
        incident_key: z.string().optional().describe('A string identifying the incident. Incidents with matching keys are grouped together.'),
        urgency: z.string().optional().describe('The urgency of the incident: high or low.'),
        service: z
            .object({
                id: z.string().describe('Unique identifier of the service.'),
                type: z.string().describe('Type of the referenced resource.'),
                summary: z.string().optional().describe('Short summary of the service.'),
                self: z.string().optional().describe('API URL of the service.'),
                html_url: z.string().optional().describe('Web URL of the service.')
            })
            .optional()
            .describe('The service associated with the incident.'),
        priority: z
            .object({
                id: z.string().describe('Unique identifier of the priority.'),
                type: z.string().describe('Type of the referenced resource.'),
                summary: z.string().optional().describe('Short summary of the priority.'),
                self: z.string().optional().describe('API URL of the priority.'),
                html_url: z.string().optional().describe('Web URL of the priority.')
            })
            .optional()
            .describe('The priority assigned to the incident.'),
        escalation_policy: z
            .object({
                id: z.string().describe('Unique identifier of the escalation policy.'),
                type: z.string().describe('Type of the referenced resource.'),
                summary: z.string().optional().describe('Short summary of the escalation policy.'),
                self: z.string().optional().describe('API URL of the escalation policy.'),
                html_url: z.string().optional().describe('Web URL of the escalation policy.')
            })
            .optional()
            .describe('The escalation policy governing the incident.'),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('Unique identifier of the team.'),
                    type: z.string().describe('Type of the referenced resource.'),
                    summary: z.string().optional().describe('Short summary of the team.'),
                    self: z.string().optional().describe('API URL of the team.'),
                    html_url: z.string().optional().describe('Web URL of the team.')
                })
            )
            .optional()
            .describe('Teams associated with the incident.'),
        assignments: z
            .array(
                z.object({
                    at: z.string().optional().describe('ISO 8601 timestamp of the assignment.'),
                    assignee: z
                        .object({
                            id: z.string().describe('Unique identifier of the assignee.'),
                            type: z.string().describe('Type of the referenced resource.'),
                            summary: z.string().optional().describe('Short summary of the assignee.'),
                            self: z.string().optional().describe('API URL of the assignee.'),
                            html_url: z.string().optional().describe('Web URL of the assignee.')
                        })
                        .optional()
                        .describe('The user assigned to the incident.')
                })
            )
            .optional()
            .describe('Current assignments of the incident.'),
        acknowledgements: z
            .array(
                z.object({
                    at: z.string().optional().describe('ISO 8601 timestamp of the acknowledgement.'),
                    acknowledger: z
                        .object({
                            id: z.string().describe('Unique identifier of the acknowledger.'),
                            type: z.string().describe('Type of the referenced resource.'),
                            summary: z.string().optional().describe('Short summary of the acknowledger.'),
                            self: z.string().optional().describe('API URL of the acknowledger.'),
                            html_url: z.string().optional().describe('Web URL of the acknowledger.')
                        })
                        .optional()
                        .describe('The user who acknowledged the incident.')
                })
            )
            .optional()
            .describe('Acknowledgements of the incident.'),
        last_status_change_at: z.string().optional().describe('ISO 8601 timestamp of the last status change.'),
        last_status_change_by: z
            .object({
                id: z.string().describe('Unique identifier of the user or service that changed the status.'),
                type: z.string().describe('Type of the referenced resource.'),
                summary: z.string().optional().describe('Short summary of the entity that changed the status.'),
                self: z.string().optional().describe('API URL of the entity that changed the status.'),
                html_url: z.string().optional().describe('Web URL of the entity that changed the status.')
            })
            .optional()
            .describe('The user or service that last changed the incident status.'),
        alert_counts: z
            .object({
                all: z.number().optional().describe('Total number of alerts.'),
                triggered: z.number().optional().describe('Number of triggered alerts.'),
                resolved: z.number().optional().describe('Number of resolved alerts.')
            })
            .optional()
            .describe('Counts of alerts associated with the incident.'),
        body: z
            .object({
                type: z.string().optional().describe('Type of the incident body.'),
                details: z.string().optional().describe('Detailed text of the incident body.')
            })
            .optional()
            .describe('The body content of the incident.')
    })
    .describe('PagerDuty incident record.');

function mapReference(ref: z.infer<typeof ProviderReferenceSchema> | null | undefined) {
    if (!present(ref)) {
        return undefined;
    }
    return {
        id: ref.id,
        type: ref.type,
        ...(present(ref.summary) && { summary: ref.summary }),
        ...(present(ref.self) && { self: ref.self }),
        ...(present(ref.html_url) && { html_url: ref.html_url })
    };
}

function mapProviderIncident(record: z.infer<typeof ProviderIncidentSchema>) {
    return {
        id: record.id,
        type: record.type,
        ...(present(record.summary) && { summary: record.summary }),
        ...(present(record.self) && { self: record.self }),
        ...(present(record.html_url) && { html_url: record.html_url }),
        ...(present(record.incident_number) && { incident_number: record.incident_number }),
        ...(present(record.title) && { title: record.title }),
        ...(present(record.description) && { description: record.description }),
        ...(present(record.status) && { status: record.status }),
        ...(present(record.created_at) && { created_at: record.created_at }),
        ...(present(record.updated_at) && { updated_at: record.updated_at }),
        ...(present(record.resolved_at) && { resolved_at: record.resolved_at }),
        ...(present(record.incident_key) && { incident_key: record.incident_key }),
        ...(present(record.urgency) && { urgency: record.urgency }),
        ...(present(record.service) && { service: mapReference(record.service) }),
        ...(present(record.priority) && { priority: mapReference(record.priority) }),
        ...(present(record.escalation_policy) && { escalation_policy: mapReference(record.escalation_policy) }),
        ...(present(record.teams) && { teams: record.teams.map(mapReference) }),
        ...(present(record.assignments) && {
            assignments: record.assignments.map((assignment) => ({
                ...(present(assignment.at) && { at: assignment.at }),
                ...(present(assignment.assignee) && { assignee: mapReference(assignment.assignee) })
            }))
        }),
        ...(present(record.acknowledgements) && {
            acknowledgements: record.acknowledgements.map((ack) => ({
                ...(present(ack.at) && { at: ack.at }),
                ...(present(ack.acknowledger) && { acknowledger: mapReference(ack.acknowledger) })
            }))
        }),
        ...(present(record.last_status_change_at) && { last_status_change_at: record.last_status_change_at }),
        ...(present(record.last_status_change_by) && { last_status_change_by: mapReference(record.last_status_change_by) }),
        ...(present(record.alert_counts) && {
            alert_counts: {
                ...(present(record.alert_counts.all) && { all: record.alert_counts.all }),
                ...(present(record.alert_counts.triggered) && { triggered: record.alert_counts.triggered }),
                ...(present(record.alert_counts.resolved) && { resolved: record.alert_counts.resolved })
            }
        }),
        ...(present(record.body) && {
            body: {
                ...(present(record.body.type) && { type: record.body.type }),
                ...(present(record.body.details) && { details: record.body.details })
            }
        })
    };
}

function shouldFullRefresh(checkpoint: z.infer<typeof CheckpointSchema> | null) {
    if (!present(checkpoint)) {
        return true;
    }
    if (!present(checkpoint['last_full_refresh_at'])) {
        return true;
    }
    const lastFullRefresh = new Date(checkpoint['last_full_refresh_at']).getTime();
    if (Number.isNaN(lastFullRefresh)) {
        return true;
    }
    return Date.now() - lastFullRefresh > FULL_REFRESH_INTERVAL_MS;
}

function parseCheckpoint(rawCheckpoint: unknown): z.infer<typeof CheckpointSchema> | null {
    if (!present(rawCheckpoint)) {
        return null;
    }

    const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);
    if (!checkpoint.success) {
        throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
    }

    return checkpoint.data;
}

const sync = createSync({
    description: 'Sync incidents.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Incident: IncidentSchema
    },

    exec: async (nango) => {
        const checkpoint = parseCheckpoint(await nango.getCheckpoint());
        const isFullRefresh = shouldFullRefresh(checkpoint);
        const syncStartTime = new Date().toISOString();

        if (isFullRefresh) {
            await nango.trackDeletesStart('Incident');

            const proxyConfig: ProxyConfiguration = {
                // https://developer.pagerduty.com/api-reference/
                endpoint: '/incidents',
                params: {
                    // Without this, PagerDuty defaults `since`/`until` to the last month and
                    // silently omits older incidents, which would make trackDeletesEnd() delete them.
                    date_range: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'incidents',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const parsedPage = z.array(ProviderIncidentSchema).parse(page);
                const incidents = parsedPage.map(mapProviderIncident);

                if (incidents.length > 0) {
                    await nango.batchSave(incidents, 'Incident');
                }
            }

            await nango.clearCheckpoint();

            await nango.saveCheckpoint({
                since: syncStartTime,
                last_full_refresh_at: syncStartTime
            });
        } else {
            if (!present(checkpoint)) {
                throw new Error('Checkpoint unexpectedly null during incremental sync');
            }

            const since = checkpoint['since'];

            // PagerDuty's /incidents `since`/`until` filters incidents by created_at, so an
            // incident created before the window that was later acknowledged or resolved would
            // never be re-fetched. /log_entries instead filters by when the *event* happened, and
            // include[]=incidents embeds the incident's current state on each entry, so it is used
            // here as the changed-record source for incremental runs.
            const logEntryProxyConfig: ProxyConfiguration = {
                // https://developer.pagerduty.com/api-reference/
                endpoint: '/log_entries',
                params: {
                    since,
                    until: syncStartTime,
                    'include[]': 'incidents'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'log_entries',
                    limit: 100
                },
                retries: 3
            };

            const changedIncidents = new Map<string, z.infer<typeof ProviderIncidentSchema>>();

            for await (const page of nango.paginate(logEntryProxyConfig)) {
                const parsedPage = z.array(z.object({ incident: ProviderIncidentSchema.nullish() })).parse(page);

                for (const entry of parsedPage) {
                    if (present(entry.incident)) {
                        changedIncidents.set(entry.incident.id, entry.incident);
                    }
                }
            }

            if (changedIncidents.size > 0) {
                const incidents = Array.from(changedIncidents.values()).map(mapProviderIncident);
                await nango.batchSave(incidents, 'Incident');
            }

            await nango.saveCheckpoint({
                since: syncStartTime,
                last_full_refresh_at: checkpoint['last_full_refresh_at']
            });
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Incident');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
