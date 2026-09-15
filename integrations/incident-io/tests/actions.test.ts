import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import type { z } from 'zod';
import listIncidentStatuses from '../actions/list-incident-statuses.js';
import getIncidentStatus from '../actions/get-incident-status.js';
import listIncidentTypes from '../actions/list-incident-types.js';
import getIncidentType from '../actions/get-incident-type.js';
import listPostmortemDocuments from '../actions/list-postmortem-documents.js';
import getPostmortemDocument from '../actions/get-postmortem-document.js';
import getPostmortemDocumentContent from '../actions/get-postmortem-document-content.js';
import listSeverities from '../actions/list-severities.js';
import getSeverity from '../actions/get-severity.js';
import listAlertTags from '../actions/list-alert-tags.js';
import listAlerts from '../actions/list-alerts.js';
import getAlert from '../actions/get-alert.js';
import addAlertTags from '../actions/add-alert-tags.js';
import removeAlertTags from '../actions/remove-alert-tags.js';
import resolveAlert from '../actions/resolve-alert.js';
import setAlertTags from '../actions/set-alert-tags.js';
import listIncidentAlerts from '../actions/list-incident-alerts.js';
import createIncidentAlert from '../actions/create-incident-alert.js';
import transitionIncidentAlert from '../actions/transition-incident-alert.js';
import listIncidentParticipantWorkloads from '../actions/list-incident-participant-workloads.js';
import listIncidentParticipants from '../actions/list-incident-participants.js';
import listIncidentRoles from '../actions/list-incident-roles.js';
import getIncidentRole from '../actions/get-incident-role.js';
import listIncidentTimelineItems from '../actions/list-incident-timeline-items.js';
import createIncidentTimelineItem from '../actions/create-incident-timeline-item.js';
import updateIncidentTimelineItem from '../actions/update-incident-timeline-item.js';
import listIncidentTimestamps from '../actions/list-incident-timestamps.js';
import getIncidentTimestamp from '../actions/get-incident-timestamp.js';
import listIncidentUpdates from '../actions/list-incident-updates.js';
import createIncidentUpdate from '../actions/create-incident-update.js';
import listIncidents from '../actions/list-incidents.js';
import createIncident from '../actions/create-incident.js';
import getIncident from '../actions/get-incident.js';
import updateIncident from '../actions/update-incident.js';
import listScheduleEntries from '../actions/list-schedule-entries.js';
import listScheduleOverrides from '../actions/list-schedule-overrides.js';
import getScheduleOverride from '../actions/get-schedule-override.js';
import listSchedules from '../actions/list-schedules.js';
import getSchedule from '../actions/get-schedule.js';
import listScheduleReplicas from '../actions/list-schedule-replicas.js';
import getScheduleReplica from '../actions/get-schedule-replica.js';
import listScheduleSyncRules from '../actions/list-schedule-sync-rules.js';
import getScheduleSyncRule from '../actions/get-schedule-sync-rule.js';
import listUsers from '../actions/list-users.js';
import getUser from '../actions/get-user.js';
import listUserNotificationMethods from '../actions/list-user-notification-methods.js';
import listUserNotificationRules from '../actions/list-user-notification-rules.js';
import getUserPagingProvider from '../actions/get-user-paging-provider.js';
import listActions from '../actions/list-actions.js';
import createAction from '../actions/create-action.js';
import getAction from '../actions/get-action.js';
import updateAction from '../actions/update-action.js';
import deleteAction from '../actions/delete-action.js';
import listCatalogEntries from '../actions/list-catalog-entries.js';
import getCatalogEntry from '../actions/get-catalog-entry.js';
import listCatalogResources from '../actions/list-catalog-resources.js';
import listCatalogTypes from '../actions/list-catalog-types.js';
import getCatalogType from '../actions/get-catalog-type.js';
import listFollowUps from '../actions/list-follow-ups.js';
import createFollowUp from '../actions/create-follow-up.js';
import getFollowUp from '../actions/get-follow-up.js';
import updateFollowUp from '../actions/update-follow-up.js';
import deleteFollowUp from '../actions/delete-follow-up.js';
import connectFollowUpExternalIssue from '../actions/connect-follow-up-external-issue.js';
import listTeams from '../actions/list-teams.js';
import getTeam from '../actions/get-team.js';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
interface ActionCase {
    name: string;
    method: Method;
    path: string;
    hasBody: boolean;
    action: { input: z.ZodTypeAny; output: z.ZodTypeAny; exec(nango: NangoActionMock, input: unknown): Promise<unknown> };
}

// Fixtures are OpenAPI examples or synthetic contract samples, never live recordings.
const cases: ActionCase[] = [
    { name: 'list-incident-statuses', method: 'get', path: '/v1/incident_statuses', hasBody: false, action: listIncidentStatuses },
    { name: 'get-incident-status', method: 'get', path: '/v1/incident_statuses/{id}', hasBody: false, action: getIncidentStatus },
    { name: 'list-incident-types', method: 'get', path: '/v1/incident_types', hasBody: false, action: listIncidentTypes },
    { name: 'get-incident-type', method: 'get', path: '/v1/incident_types/{id}', hasBody: false, action: getIncidentType },
    { name: 'list-postmortem-documents', method: 'get', path: '/v1/postmortem_documents', hasBody: false, action: listPostmortemDocuments },
    { name: 'get-postmortem-document', method: 'get', path: '/v1/postmortem_documents/{id}', hasBody: false, action: getPostmortemDocument },
    {
        name: 'get-postmortem-document-content',
        method: 'get',
        path: '/v1/postmortem_documents/{id}/content',
        hasBody: false,
        action: getPostmortemDocumentContent
    },
    { name: 'list-severities', method: 'get', path: '/v1/severities', hasBody: false, action: listSeverities },
    { name: 'get-severity', method: 'get', path: '/v1/severities/{id}', hasBody: false, action: getSeverity },
    { name: 'list-alert-tags', method: 'get', path: '/v2/alert_tags', hasBody: false, action: listAlertTags },
    { name: 'list-alerts', method: 'get', path: '/v2/alerts', hasBody: false, action: listAlerts },
    { name: 'get-alert', method: 'get', path: '/v2/alerts/{id}', hasBody: false, action: getAlert },
    { name: 'add-alert-tags', method: 'post', path: '/v2/alerts/{id}/actions/add_tags', hasBody: true, action: addAlertTags },
    { name: 'remove-alert-tags', method: 'post', path: '/v2/alerts/{id}/actions/remove_tags', hasBody: true, action: removeAlertTags },
    { name: 'resolve-alert', method: 'post', path: '/v2/alerts/{id}/actions/resolve', hasBody: false, action: resolveAlert },
    { name: 'set-alert-tags', method: 'post', path: '/v2/alerts/{id}/actions/set_tags', hasBody: true, action: setAlertTags },
    { name: 'list-incident-alerts', method: 'get', path: '/v2/incident_alerts', hasBody: false, action: listIncidentAlerts },
    { name: 'create-incident-alert', method: 'post', path: '/v2/incident_alerts', hasBody: true, action: createIncidentAlert },
    { name: 'transition-incident-alert', method: 'post', path: '/v2/incident_alerts/{id}/actions/transition', hasBody: true, action: transitionIncidentAlert },
    {
        name: 'list-incident-participant-workloads',
        method: 'get',
        path: '/v2/incident_participant_workloads',
        hasBody: false,
        action: listIncidentParticipantWorkloads
    },
    { name: 'list-incident-participants', method: 'get', path: '/v2/incident_participants', hasBody: false, action: listIncidentParticipants },
    { name: 'list-incident-roles', method: 'get', path: '/v2/incident_roles', hasBody: false, action: listIncidentRoles },
    { name: 'get-incident-role', method: 'get', path: '/v2/incident_roles/{id}', hasBody: false, action: getIncidentRole },
    { name: 'list-incident-timeline-items', method: 'get', path: '/v2/incident_timeline_items', hasBody: false, action: listIncidentTimelineItems },
    { name: 'create-incident-timeline-item', method: 'post', path: '/v2/incident_timeline_items', hasBody: true, action: createIncidentTimelineItem },
    { name: 'update-incident-timeline-item', method: 'patch', path: '/v2/incident_timeline_items/{id}', hasBody: true, action: updateIncidentTimelineItem },
    { name: 'list-incident-timestamps', method: 'get', path: '/v2/incident_timestamps', hasBody: false, action: listIncidentTimestamps },
    { name: 'get-incident-timestamp', method: 'get', path: '/v2/incident_timestamps/{id}', hasBody: false, action: getIncidentTimestamp },
    { name: 'list-incident-updates', method: 'get', path: '/v2/incident_updates', hasBody: false, action: listIncidentUpdates },
    { name: 'create-incident-update', method: 'post', path: '/v2/incident_updates', hasBody: true, action: createIncidentUpdate },
    { name: 'list-incidents', method: 'get', path: '/v2/incidents', hasBody: false, action: listIncidents },
    { name: 'create-incident', method: 'post', path: '/v2/incidents', hasBody: true, action: createIncident },
    { name: 'get-incident', method: 'get', path: '/v2/incidents/{id}', hasBody: false, action: getIncident },
    { name: 'update-incident', method: 'post', path: '/v2/incidents/{id}/actions/edit', hasBody: true, action: updateIncident },
    { name: 'list-schedule-entries', method: 'get', path: '/v2/schedule_entries', hasBody: false, action: listScheduleEntries },
    { name: 'list-schedule-overrides', method: 'get', path: '/v2/schedule_overrides', hasBody: false, action: listScheduleOverrides },
    { name: 'get-schedule-override', method: 'get', path: '/v2/schedule_overrides/{id}', hasBody: false, action: getScheduleOverride },
    { name: 'list-schedules', method: 'get', path: '/v2/schedules', hasBody: false, action: listSchedules },
    { name: 'get-schedule', method: 'get', path: '/v2/schedules/{id}', hasBody: false, action: getSchedule },
    { name: 'list-schedule-replicas', method: 'get', path: '/v2/schedules/{schedule_id}/replicas', hasBody: false, action: listScheduleReplicas },
    { name: 'get-schedule-replica', method: 'get', path: '/v2/schedules/{schedule_id}/replicas/{id}', hasBody: false, action: getScheduleReplica },
    { name: 'list-schedule-sync-rules', method: 'get', path: '/v2/schedules/{schedule_id}/sync_rules', hasBody: false, action: listScheduleSyncRules },
    { name: 'get-schedule-sync-rule', method: 'get', path: '/v2/schedules/{schedule_id}/sync_rules/{id}', hasBody: false, action: getScheduleSyncRule },
    { name: 'list-users', method: 'get', path: '/v2/users', hasBody: false, action: listUsers },
    { name: 'get-user', method: 'get', path: '/v2/users/{id}', hasBody: false, action: getUser },
    {
        name: 'list-user-notification-methods',
        method: 'get',
        path: '/v2/users/{user_id}/notification_methods',
        hasBody: false,
        action: listUserNotificationMethods
    },
    { name: 'list-user-notification-rules', method: 'get', path: '/v2/users/{user_id}/notification_rules', hasBody: false, action: listUserNotificationRules },
    { name: 'get-user-paging-provider', method: 'get', path: '/v2/users/{user_id}/paging_provider', hasBody: false, action: getUserPagingProvider },
    { name: 'list-actions', method: 'get', path: '/v3/actions', hasBody: false, action: listActions },
    { name: 'create-action', method: 'post', path: '/v3/actions', hasBody: true, action: createAction },
    { name: 'get-action', method: 'get', path: '/v3/actions/{id}', hasBody: false, action: getAction },
    { name: 'update-action', method: 'put', path: '/v3/actions/{id}', hasBody: true, action: updateAction },
    { name: 'delete-action', method: 'delete', path: '/v3/actions/{id}', hasBody: false, action: deleteAction },
    { name: 'list-catalog-entries', method: 'get', path: '/v3/catalog_entries', hasBody: false, action: listCatalogEntries },
    { name: 'get-catalog-entry', method: 'get', path: '/v3/catalog_entries/{id}', hasBody: false, action: getCatalogEntry },
    { name: 'list-catalog-resources', method: 'get', path: '/v3/catalog_resources', hasBody: false, action: listCatalogResources },
    { name: 'list-catalog-types', method: 'get', path: '/v3/catalog_types', hasBody: false, action: listCatalogTypes },
    { name: 'get-catalog-type', method: 'get', path: '/v3/catalog_types/{id}', hasBody: false, action: getCatalogType },
    { name: 'list-follow-ups', method: 'get', path: '/v3/follow_ups', hasBody: false, action: listFollowUps },
    { name: 'create-follow-up', method: 'post', path: '/v3/follow_ups', hasBody: true, action: createFollowUp },
    { name: 'get-follow-up', method: 'get', path: '/v3/follow_ups/{id}', hasBody: false, action: getFollowUp },
    { name: 'update-follow-up', method: 'put', path: '/v3/follow_ups/{id}', hasBody: true, action: updateFollowUp },
    { name: 'delete-follow-up', method: 'delete', path: '/v3/follow_ups/{id}', hasBody: false, action: deleteFollowUp },
    {
        name: 'connect-follow-up-external-issue',
        method: 'post',
        path: '/v3/follow_ups/{id}/actions/connect_external_issue',
        hasBody: true,
        action: connectFollowUpExternalIssue
    },
    { name: 'list-teams', method: 'get', path: '/v3/teams', hasBody: false, action: listTeams },
    { name: 'get-team', method: 'get', path: '/v3/teams/{id}', hasBody: false, action: getTeam }
];

function pathKeys(path: string): string[] {
    return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? '');
}

for (const spec of cases) {
    describe(spec.name, () => {
        async function setup() {
            const fixture = JSON.parse(readFileSync(new URL(`./${spec.name}.fixture.json`, import.meta.url), 'utf8'));
            const nango = new NangoActionMock({ dirname: __dirname, name: spec.name, Model: 'Output' });
            nango[spec.method].mockResolvedValue({ data: fixture.response });
            return { action: spec.action, fixture, nango };
        }

        it('validates the contract and forwards the request through the provider proxy', async () => {
            const { action, fixture, nango } = await setup();
            const input = action.input.parse(fixture.input);
            const output = await action.exec(nango, input);
            expect(action.output.safeParse(output).success).toBe(true);
            expect(output).toMatchObject(fixture.response);
            const keys = pathKeys(spec.path);
            const endpoint = spec.path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
            expect(nango[spec.method]).toHaveBeenCalledOnce();
            expect(nango[spec.method]).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
            if (spec.hasBody) expect(nango[spec.method]).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
            // Every input that is neither a path segment nor the body must reach the provider as a query parameter, unchanged.
            const queryKeys = Object.keys(fixture.input).filter((key) => key !== 'body' && !keys.includes(key));
            if (queryKeys.length > 0) {
                const config: { params?: Record<string, unknown> } | undefined = nango[spec.method].mock.calls[0]?.[0];
                const sent = Object.fromEntries(Object.entries(config?.params ?? {}).map(([key, value]) => [key, String(value)]));
                const expected = Object.fromEntries(queryKeys.map((key) => [key, String(fixture.input[key])]));
                expect(sent).toEqual(expected);
            }
        });

        it('propagates provider failures', async () => {
            const { action, fixture, nango } = await setup();
            nango[spec.method].mockRejectedValue(new Error('Provider unavailable'));
            await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
        });

        if (spec.method === 'delete') {
            it('returns an empty object for a no-content response', async () => {
                const { action, fixture, nango } = await setup();
                nango[spec.method].mockResolvedValue({ data: undefined });
                await expect(action.exec(nango, action.input.parse(fixture.input))).resolves.toEqual({});
            });
        } else {
            it('rejects a malformed provider envelope', async () => {
                const { action, fixture, nango } = await setup();
                nango[spec.method].mockResolvedValue({ data: null });
                await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
            });
        }
    });
}
