import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-issue-comment.js';

describe('github-app-oauth add-issue-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-issue-comment',
        Model: 'ActionOutput_github_app_oauth_addissuecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
