import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unlock-user.js';

describe('okta unlock-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unlock-user',
        Model: 'ActionOutput_okta_cc_unlockuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
