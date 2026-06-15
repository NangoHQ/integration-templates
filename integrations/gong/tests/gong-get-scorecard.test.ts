import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-scorecard.js';

describe('gong-oauth get-scorecard tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-scorecard',
        Model: 'ActionOutput_gong_oauth_getscorecard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
