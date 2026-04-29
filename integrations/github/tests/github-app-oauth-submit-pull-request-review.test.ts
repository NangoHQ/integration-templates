import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-pull-request-review.js';

describe('github-app-oauth submit-pull-request-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-pull-request-review',
        Model: 'ActionOutput_github_app_oauth_submitpullrequestreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
