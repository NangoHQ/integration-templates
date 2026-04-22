import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow-state.js';

describe('linear get-workflow-state tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow-state',
        Model: 'ActionOutput_linear_getworkflowstate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
