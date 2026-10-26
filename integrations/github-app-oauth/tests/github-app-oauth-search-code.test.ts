import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-code.js';

describe('github-app-oauth search-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-code',
        Model: 'ActionOutput_github_app_oauth_searchcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
