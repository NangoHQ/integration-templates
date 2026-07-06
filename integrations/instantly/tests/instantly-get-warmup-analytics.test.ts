import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-warmup-analytics.js';

describe('instantly get-warmup-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-warmup-analytics',
        Model: 'ActionOutput_instantly_getwarmupanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
