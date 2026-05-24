import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-account.js';

describe('apollo update-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-account',
        Model: 'ActionOutput_apollo_oauth_updateaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
