import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-current-member.js';

describe('shortcut get-current-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-current-member',
        Model: 'ActionOutput_shortcut_getcurrentmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
