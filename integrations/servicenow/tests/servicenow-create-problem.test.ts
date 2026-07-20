import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-problem.js';

describe('servicenow create-problem tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-problem',
        Model: 'ActionOutput_servicenow_createproblem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
