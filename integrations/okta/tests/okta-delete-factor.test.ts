import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-factor.js';

describe('okta delete-factor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-factor',
        Model: 'ActionOutput_okta_cc_deletefactor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
