import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-edit-issue-metadata.js';

describe('jira get-edit-issue-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-edit-issue-metadata',
        Model: 'ActionOutput_jira_geteditissuemetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
