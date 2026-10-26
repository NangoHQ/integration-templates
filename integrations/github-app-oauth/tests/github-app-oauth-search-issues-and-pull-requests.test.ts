import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-issues-and-pull-requests.js';

describe('github-app-oauth search-issues-and-pull-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-issues-and-pull-requests',
        Model: 'ActionOutput_github_app_oauth_searchissuesandpullrequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
