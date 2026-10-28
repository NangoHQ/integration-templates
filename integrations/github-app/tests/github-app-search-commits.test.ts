import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-commits.js';

describe('github-app search-commits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-commits',
        Model: 'ActionOutput_github_app_searchcommits'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
