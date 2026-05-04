import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-release.js';

describe('github-app-oauth delete-release tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-release',
        Model: 'ActionOutput_github_app_oauth_deleterelease'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
