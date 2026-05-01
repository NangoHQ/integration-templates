import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-issue-link.js';

describe('jira create-issue-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-issue-link',
        Model: 'ActionOutput_jira_createissuelink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
