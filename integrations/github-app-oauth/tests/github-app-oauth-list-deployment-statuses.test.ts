import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deployment-statuses.js';

describe('github-app-oauth list-deployment-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deployment-statuses',
        Model: 'ActionOutput_github_app_oauth_listdeploymentstatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
