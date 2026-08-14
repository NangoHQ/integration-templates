import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-slo-history.js';

describe('datadog get-slo-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-slo-history',
        Model: 'ActionOutput_datadog_getslohistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
