import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-hook.js';

describe('make create-hook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-hook',
        Model: 'ActionOutput_make_createhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
