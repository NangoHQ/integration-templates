import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/revert-to-review-workflow.js';

describe('ironclad revert-to-review-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'revert-to-review-workflow',
        Model: 'ActionOutput_ironclad_reverttoreviewworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
