import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reactivate-user.js';

describe('lever-basic reactivate-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reactivate-user',
        Model: 'ActionOutput_lever_basic_reactivateuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
