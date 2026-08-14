import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-metrics.js';

describe('datadog query-metrics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-metrics',
        Model: 'ActionOutput_datadog_querymetrics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
