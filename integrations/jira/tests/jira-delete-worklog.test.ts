import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-worklog.js';

describe('jira delete-worklog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-worklog',
        Model: 'ActionOutput_jira_deleteworklog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
