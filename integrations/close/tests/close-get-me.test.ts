import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-me.js';

describe('close get-me tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-me',
        Model: 'ActionOutput_close_getme'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
