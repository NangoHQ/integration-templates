import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-security-problem.js';

describe('dynatrace get-security-problem tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-security-problem',
        Model: 'ActionOutput_dynatrace_getsecurityproblem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
