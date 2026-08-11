import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow-run.js';

describe('github-app-oauth get-workflow-run tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow-run',
        Model: 'ActionOutput_github_app_oauth_getworkflowrun'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
