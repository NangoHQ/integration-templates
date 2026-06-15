import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calls.js';

describe('gong-oauth list-calls tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calls',
        Model: 'ActionOutput_gong_oauth_listcalls'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
