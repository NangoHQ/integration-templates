import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sender-time-series.js';

describe('mandrill get-sender-time-series tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sender-time-series',
        Model: 'ActionOutput_mandrill_getsendertimeseries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
