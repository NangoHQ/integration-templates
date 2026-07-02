import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/ping-hook.js';

describe('make ping-hook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'ping-hook',
        Model: 'ActionOutput_make_pinghook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
