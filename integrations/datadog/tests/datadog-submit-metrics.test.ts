import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-metrics.js';

describe('datadog submit-metrics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-metrics',
        Model: 'ActionOutput_datadog_submitmetrics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
