import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-types.js';

describe('okta list-user-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-types',
        Model: 'ActionOutput_okta_cc_listusertypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
