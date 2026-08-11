import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/trigger-workflow-dispatch.js';

describe('github-app-oauth trigger-workflow-dispatch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'trigger-workflow-dispatch',
        Model: 'ActionOutput_github_app_oauth_triggerworkflowdispatch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
