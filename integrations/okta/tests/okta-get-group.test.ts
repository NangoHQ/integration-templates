import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-group.js';

describe('okta get-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-group',
        Model: 'ActionOutput_okta_cc_getgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
