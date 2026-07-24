import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-recruiters.js';

describe('workable list-job-recruiters tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-recruiters',
        Model: 'ActionOutput_workable_listjobrecruiters'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
