import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-label.js';

describe('github-app-oauth delete-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-label',
        Model: 'ActionOutput_github_app_oauth_deletelabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
