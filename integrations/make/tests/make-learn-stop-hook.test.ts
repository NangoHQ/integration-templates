import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/learn-stop-hook.js';

describe('make learn-stop-hook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'learn-stop-hook',
        Model: 'ActionOutput_make_learnstophook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
