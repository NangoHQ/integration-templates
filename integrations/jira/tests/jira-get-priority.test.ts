import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-priority.js';

describe('jira get-priority tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-priority',
        Model: 'ActionOutput_jira_getpriority'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
