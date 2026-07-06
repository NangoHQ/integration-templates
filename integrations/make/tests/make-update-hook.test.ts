import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-hook.js';

describe('make update-hook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-hook',
        Model: 'ActionOutput_make_updatehook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
