import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-issue-types.js';

describe('jira list-issue-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-issue-types',
        Model: 'ActionOutput_jira_listissuetypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
