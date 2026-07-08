import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-group-from-application.js';

describe('okta remove-group-from-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-group-from-application',
        Model: 'ActionOutput_okta_cc_removegroupfromapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
