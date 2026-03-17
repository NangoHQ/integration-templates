import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-tickets.js';

describe('hubspot search-tickets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-tickets',
        Model: 'ActionOutput_hubspot_searchtickets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
