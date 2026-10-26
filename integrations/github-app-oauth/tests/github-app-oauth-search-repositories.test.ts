import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-repositories.js';

describe('github-app-oauth search-repositories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-repositories',
        Model: 'ActionOutput_github_app_oauth_searchrepositories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
