import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-problem.js';

describe('dynatrace get-problem tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-problem',
        Model: 'ActionOutput_dynatrace_getproblem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
