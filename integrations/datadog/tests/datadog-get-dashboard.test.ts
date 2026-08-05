import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-dashboard.js';

describe('datadog get-dashboard tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-dashboard',
        Model: 'ActionOutput_datadog_getdashboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
