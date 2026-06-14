import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-logs.js';

describe('gong-oauth get-logs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-logs',
        Model: 'ActionOutput_gong_oauth_getlogs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
