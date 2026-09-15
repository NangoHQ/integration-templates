import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
function fixture(name: string) {
    return JSON.parse(readFileSync(new URL(`./${name}.fixture.json`, import.meta.url), 'utf8'));
}
function mock(name: string) {
    return new NangoActionMock({ dirname: __dirname, name, Model: 'Output' });
}
async function expectNoContent(action: { exec(nango: NangoActionMock, input: { id: string }): Promise<unknown> }, name: string) {
    const nango = mock(name);
    nango.delete.mockResolvedValue({ data: undefined });
    expect(await action.exec(nango, { id: 'record' })).toEqual({});
    expect(nango.delete).toHaveBeenCalledOnce();
}

import incidents from '../actions/list-incidents.js';
import followUps from '../actions/list-follow-ups.js';
import actions from '../actions/list-actions.js';
import getIncident from '../actions/get-incident.js';
import listAlerts from '../actions/list-alerts.js';
import listCatalogEntries from '../actions/list-catalog-entries.js';
import listUsers from '../actions/list-users.js';
import listSchedules from '../actions/list-schedules.js';
import listScheduleEntries from '../actions/list-schedule-entries.js';
import listScheduleReplicas from '../actions/list-schedule-replicas.js';
import listIncidentTimelineItems from '../actions/list-incident-timeline-items.js';
import connectFollowUpExternalIssue from '../actions/connect-follow-up-external-issue.js';
import updateFollowUp from '../actions/update-follow-up.js';
import deleteAction from '../actions/delete-action.js';
import deleteFollowUp from '../actions/delete-follow-up.js';
describe('incident.io versions, nullability, and pagination', () => {
    it('forwards incident cursors and terminates when the provider omits after', async () => {
        const nango = mock('list-incidents');
        nango.get.mockResolvedValueOnce({ data: { incidents: [], pagination_meta: { after: 'next', page_size: 25 } } });
        expect((await incidents.exec(nango, { after: 'previous', page_size: 25 })).next_cursor).toBe('next');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/incidents', params: { after: 'previous', page_size: 25 } }));
        nango.get.mockResolvedValueOnce({ data: { incidents: [], pagination_meta: { page_size: 25 } } });
        expect((await incidents.exec(nango, {})).next_cursor).toBeUndefined();
    });
    it('uses v3 follow-ups with nullable assignees and priorities', async () => {
        const nango = mock('list-follow-ups');
        const response = fixture('list-follow-ups').response;
        response.follow_ups[0].assignee = null;
        response.follow_ups[0].priority = null;
        nango.get.mockResolvedValue({ data: response });
        const result = await followUps.exec(nango, { incident_id: 'incident', page_size: 10 });
        expect(result.follow_ups[0]?.assignee).toBeNull();
        expect(result.follow_ups[0]?.priority).toBeNull();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v3/follow_ups', params: { incident_id: 'incident', page_size: 10 } }));
    });
    it('accepts null follow-up relationships after connecting an external issue', async () => {
        const nango = mock('connect-follow-up-external-issue');
        const { input, response } = fixture('connect-follow-up-external-issue');
        for (const key of ['assignee', 'assignee_team', 'category', 'external_issue_reference', 'priority']) response.follow_up[key] = null;
        nango.post.mockResolvedValue({ data: response });
        const result = await connectFollowUpExternalIssue.exec(nango, input);
        expect(result.follow_up.assignee).toBeNull();
        expect(result.follow_up.external_issue_reference).toBeNull();
    });
    it('accepts null sync state on schedule replicas and null activity log ids on timeline items', async () => {
        const replicas = mock('list-schedule-replicas');
        const replicaResponse = fixture('list-schedule-replicas').response;
        replicaResponse.schedule_replicas[0].last_sync_error = null;
        replicaResponse.schedule_replicas[0].last_synced_at = null;
        replicaResponse.schedule_replicas[0].user_statuses[0].external_user_id = null;
        replicas.get.mockResolvedValue({ data: replicaResponse });
        const replica = (await listScheduleReplicas.exec(replicas, { schedule_id: 'schedule' })).schedule_replicas[0];
        expect(replica?.last_sync_error).toBeNull();
        expect(replica?.last_synced_at).toBeNull();
        expect(replica?.user_statuses[0]?.external_user_id).toBeNull();

        const items = mock('list-incident-timeline-items');
        const itemResponse = fixture('list-incident-timeline-items').response;
        itemResponse.incident_timeline_items[0].activity_log_id = null;
        items.get.mockResolvedValue({ data: itemResponse });
        const item = (await listIncidentTimelineItems.exec(items, { incident_id: 'incident' })).incident_timeline_items[0];
        expect(item?.activity_log_id).toBeNull();
    });
    it('accepts null assignment ids to unassign a follow-up', () => {
        const body = { assignee_id: null, assignee_team_id: null, status: 'outstanding', title: 'Rotate credentials' };
        expect(updateFollowUp.input.safeParse({ id: 'follow-up', body }).success).toBe(true);
    });
    it('returns an empty object for a no-content delete without reading the body', async () => {
        await expectNoContent(deleteAction, 'delete-action');
        await expectNoContent(deleteFollowUp, 'delete-follow-up');
    });
    it('continues schedule entries by sending the cursor as entry_window_start', async () => {
        const nango = mock('list-schedule-entries');
        const response = fixture('list-schedule-entries').response;
        nango.get.mockResolvedValueOnce({ data: response });
        const first = await listScheduleEntries.exec(nango, {
            schedule_id: 'schedule',
            entry_window_start: '2021-01-01T00:00:00Z',
            entry_window_end: '2021-01-08T00:00:00Z'
        });
        expect(first.next_cursor).toBe('abc123');
        nango.get.mockResolvedValueOnce({ data: { schedule_entries: response.schedule_entries } });
        const second = await listScheduleEntries.exec(nango, { schedule_id: 'schedule', after: first.next_cursor, entry_window_end: '2021-01-08T00:00:00Z' });
        expect(second.next_cursor).toBeUndefined();
        expect(nango.get).toHaveBeenLastCalledWith(
            expect.objectContaining({
                endpoint: '/v2/schedule_entries',
                params: { schedule_id: 'schedule', entry_window_start: 'abc123', entry_window_end: '2021-01-08T00:00:00Z' }
            })
        );
    });
    it('uses the current v3 actions endpoint', async () => {
        const nango = mock('list-actions');
        nango.get.mockResolvedValue({ data: fixture('list-actions').response });
        await actions.exec(nango, { page_size: 10 });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v3/actions' }));
    });
    it('encodes incident IDs', async () => {
        const nango = mock('get-incident');
        nango.get.mockResolvedValue({ data: fixture('get-incident').response });
        await getIncident.exec(nango, { id: 'incident/path?#' });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/incidents/incident%2Fpath%3F%23' }));
    });
    it('validates page size bounds against the pagination_meta limit', () => {
        expect(incidents.input.safeParse({ page_size: 251 }).success).toBe(false);
        expect(followUps.input.safeParse({ page_size: 251 }).success).toBe(false);
        expect(listUsers.input.safeParse({ page_size: 251 }).success).toBe(false);
        expect(listSchedules.input.safeParse({ page_size: 251 }).success).toBe(false);
        expect(listAlerts.input.safeParse({ page_size: 51 }).success).toBe(false);
        expect(actions.input.safeParse({ page_size: 0 }).success).toBe(false);
    });
    it('lets callers omit page_size so the provider default applies', () => {
        expect(listAlerts.input.safeParse({}).success).toBe(true);
        expect(listCatalogEntries.input.safeParse({ catalog_type_id: 'type' }).success).toBe(true);
        expect(listUsers.input.safeParse({}).success).toBe(true);
    });
});
