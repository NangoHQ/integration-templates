import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-field.js';

describe('jira get-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-field',
        Model: 'ActionOutput_jira_getfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
