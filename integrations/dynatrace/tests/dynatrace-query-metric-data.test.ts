import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-metric-data.js';

describe('dynatrace query-metric-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-metric-data',
        Model: 'ActionOutput_dynatrace_querymetricdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
