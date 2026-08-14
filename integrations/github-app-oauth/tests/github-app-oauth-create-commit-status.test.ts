import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-commit-status.js';

describe('github-app-oauth create-commit-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-commit-status',
        Model: 'ActionOutput_github_app_oauth_createcommitstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
