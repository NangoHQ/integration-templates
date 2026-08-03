import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resume-workflow.js';

describe('ironclad resume-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-workflow',
        Model: 'ActionOutput_ironclad_resumeworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
