import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enable-hook.js';

describe('make enable-hook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enable-hook',
        Model: 'ActionOutput_make_enablehook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
