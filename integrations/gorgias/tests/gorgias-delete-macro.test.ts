import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-macro.js';

describe('gorgias delete-macro tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-macro',
        Model: 'ActionOutput_gorgias_deletemacro'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
