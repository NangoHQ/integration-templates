import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-worklog.js';

describe('jira add-worklog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-worklog',
        Model: 'ActionOutput_jira_addworklog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
