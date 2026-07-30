import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-profile.js';

describe('youcanbook-me-public get-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-profile',
        Model: 'ActionOutput_youcanbook_me_public_getprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
