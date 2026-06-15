import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-coaching-metrics.js';

describe('gong-oauth get-coaching-metrics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-coaching-metrics',
        Model: 'ActionOutput_gong_oauth_getcoachingmetrics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
