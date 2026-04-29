import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/rerun-workflow-run.js';

describe('github-app-oauth rerun-workflow-run tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'rerun-workflow-run',
        Model: 'ActionOutput_github_app_oauth_rerunworkflowrun'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
