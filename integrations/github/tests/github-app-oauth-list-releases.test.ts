import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-releases.js';

describe('github-app-oauth list-releases tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-releases',
        Model: 'ActionOutput_github_app_oauth_listreleases'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
