import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-release.js';

describe('github-app-oauth create-release tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-release',
        Model: 'ActionOutput_github_app_oauth_createrelease'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
