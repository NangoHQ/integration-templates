import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-directory-role.js';

describe('microsoft get-directory-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-directory-role',
        Model: 'ActionOutput_microsoft_getdirectoryrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
