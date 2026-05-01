import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-watcher.js';

describe('jira add-watcher tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-watcher',
        Model: 'ActionOutput_jira_addwatcher'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
