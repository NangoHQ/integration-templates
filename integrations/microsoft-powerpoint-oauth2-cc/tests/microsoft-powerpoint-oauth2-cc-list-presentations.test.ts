import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-presentations.js';

describe('microsoft-powerpoint-oauth2-cc list-presentations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-presentations',
        Model: 'ActionOutput_microsoft_powerpoint_oauth2_cc_listpresentations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
