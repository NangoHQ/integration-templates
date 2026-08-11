import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow-run-job.js';

describe('github-app-oauth get-workflow-run-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow-run-job',
        Model: 'ActionOutput_github_app_oauth_getworkflowrunjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
