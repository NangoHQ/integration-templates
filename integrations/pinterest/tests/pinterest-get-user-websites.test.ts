import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-websites.js';

describe('pinterest get-user-websites tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-websites',
        Model: 'ActionOutput_pinterest_getuserwebsites'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
