import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-create-issue-metadata.js';

describe('jira get-create-issue-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-create-issue-metadata',
        Model: 'ActionOutput_jira_getcreateissuemetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
