import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-messages-time-series.js';

describe('mandrill search-messages-time-series tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-messages-time-series',
        Model: 'ActionOutput_mandrill_searchmessagestimeseries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
