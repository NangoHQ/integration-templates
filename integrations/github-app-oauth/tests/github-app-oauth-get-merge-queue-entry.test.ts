import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-merge-queue-entry.js';

describe('github-app-oauth get-merge-queue-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-merge-queue-entry',
        Model: 'ActionOutput_github_app_oauth_getmergequeueentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
