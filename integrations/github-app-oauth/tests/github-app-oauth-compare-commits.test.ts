import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/compare-commits.js';

describe('github-app-oauth compare-commits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'compare-commits',
        Model: 'ActionOutput_github_app_oauth_comparecommits'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
