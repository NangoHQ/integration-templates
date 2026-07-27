import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-candidates.js';

describe('workable list-job-candidates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-candidates',
        Model: 'ActionOutput_workable_listjobcandidates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
