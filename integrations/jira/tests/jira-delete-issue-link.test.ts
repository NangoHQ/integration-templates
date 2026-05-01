import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-issue-link.js';

describe('jira delete-issue-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-issue-link',
        Model: 'ActionOutput_jira_deleteissuelink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
