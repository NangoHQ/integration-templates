import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-job-errors.js';

describe('auth0-cc get-job-errors tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job-errors',
        Model: 'ActionOutput_auth0_cc_getjoberrors'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
