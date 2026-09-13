import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
function fixture(name: string) {
    return JSON.parse(readFileSync(new URL(`./${name}.fixture.json`, import.meta.url), 'utf8'));
}
function mock(name: string) {
    return new NangoActionMock({ dirname: __dirname, name, Model: 'Output' });
}

import incidents from '../actions/list-incidents.js';
import followUps from '../actions/list-follow-ups.js';
import actions from '../actions/list-actions.js';
import getIncident from '../actions/get-incident.js';
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
    it('validates v3 page size bounds', () => {
        expect(followUps.input.safeParse({ page_size: 251 }).success).toBe(false);
        expect(actions.input.safeParse({ page_size: 0 }).success).toBe(false);
    });
});
