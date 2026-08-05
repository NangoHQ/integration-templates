import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-rum-metrics.js';

describe('datadog list-rum-metrics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-rum-metrics',
        Model: 'ActionOutput_datadog_listrummetrics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
