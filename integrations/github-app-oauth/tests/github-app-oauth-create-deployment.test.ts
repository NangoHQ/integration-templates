import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-deployment.js';

describe('github-app-oauth create-deployment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-deployment',
        Model: 'ActionOutput_github_app_oauth_createdeployment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
