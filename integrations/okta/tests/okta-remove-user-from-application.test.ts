import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-user-from-application.js';

describe('okta remove-user-from-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-user-from-application',
        Model: 'ActionOutput_okta_cc_removeuserfromapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
