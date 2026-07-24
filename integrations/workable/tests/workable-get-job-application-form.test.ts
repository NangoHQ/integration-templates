import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-job-application-form.js';

describe('workable get-job-application-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job-application-form',
        Model: 'ActionOutput_workable_getjobapplicationform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
