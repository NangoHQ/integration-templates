import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-account.js';

describe('instantly patch-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-account',
        Model: 'ActionOutput_instantly_patchaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
