import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-metric-aggregates.js';

describe('klaviyo query-metric-aggregates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-metric-aggregates',
        Model: 'ActionOutput_klaviyo_querymetricaggregates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
