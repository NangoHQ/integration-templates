import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-labels.js';

describe('github-app search-labels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-labels',
        Model: 'ActionOutput_github_app_searchlabels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
