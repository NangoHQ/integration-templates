import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow.js';

describe('ironclad get-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow',
        Model: 'ActionOutput_ironclad_getworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
