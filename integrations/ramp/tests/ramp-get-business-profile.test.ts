import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-business-profile.js';

describe('ramp get-business-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-business-profile',
        Model: 'ActionOutput_ramp_getbusinessprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
