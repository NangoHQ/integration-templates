import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-user-group.js';

describe('okta remove-user-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-user-group',
        Model: 'ActionOutput_okta_cc_removeusergroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
