import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-all-tags-time-series.js';

describe('mandrill get-all-tags-time-series tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-all-tags-time-series',
        Model: 'ActionOutput_mandrill_getalltagstimeseries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
