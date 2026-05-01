import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-issue-changelog.js';

describe('jira get-issue-changelog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-issue-changelog',
        Model: 'ActionOutput_jira_getissuechangelog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
