import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow-async-job-status.js';

describe('ironclad get-workflow-async-job-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow-async-job-status',
        Model: 'ActionOutput_ironclad_getworkflowasyncjobstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
