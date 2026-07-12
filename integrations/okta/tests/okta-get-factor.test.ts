import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-factor.js';

describe('okta get-factor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-factor',
        Model: 'ActionOutput_okta_cc_getfactor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
