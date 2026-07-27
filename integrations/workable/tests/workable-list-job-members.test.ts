import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-members.js';

describe('workable list-job-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-members',
        Model: 'ActionOutput_workable_listjobmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
