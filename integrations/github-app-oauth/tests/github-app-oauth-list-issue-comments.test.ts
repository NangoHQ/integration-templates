import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-issue-comments.js';

describe('github-app-oauth list-issue-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-issue-comments',
        Model: 'ActionOutput_github_app_oauth_listissuecomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
