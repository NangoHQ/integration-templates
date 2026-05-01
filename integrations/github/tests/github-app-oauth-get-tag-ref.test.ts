import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tag-ref.js';

describe('github-app-oauth get-tag-ref tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tag-ref',
        Model: 'ActionOutput_github_app_oauth_gettagref'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
