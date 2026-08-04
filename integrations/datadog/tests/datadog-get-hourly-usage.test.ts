import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-hourly-usage.js';

describe('datadog get-hourly-usage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-hourly-usage',
        Model: 'ActionOutput_datadog_gethourlyusage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
