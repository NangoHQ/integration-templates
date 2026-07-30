import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-workflow.js';

describe('ironclad cancel-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-workflow',
        Model: 'ActionOutput_ironclad_cancelworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
