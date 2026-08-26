import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-my-preferences.js';

describe('basecamp get-my-preferences tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-my-preferences',
        Model: 'ActionOutput_basecamp_getmypreferences'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
