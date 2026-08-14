import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-deployment-status.js';

describe('github-app-oauth create-deployment-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-deployment-status',
        Model: 'ActionOutput_github_app_oauth_createdeploymentstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
