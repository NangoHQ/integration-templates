import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-topics.js';

describe('github-app search-topics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-topics',
        Model: 'ActionOutput_github_app_searchtopics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
