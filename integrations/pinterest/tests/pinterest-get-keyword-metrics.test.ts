import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-keyword-metrics.js';

describe('pinterest get-keyword-metrics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-keyword-metrics',
        Model: 'ActionOutput_pinterest_getkeywordmetrics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
