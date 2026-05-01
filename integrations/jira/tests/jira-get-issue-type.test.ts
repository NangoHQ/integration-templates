import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-issue-type.js';

describe('jira get-issue-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-issue-type',
        Model: 'ActionOutput_jira_getissuetype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
