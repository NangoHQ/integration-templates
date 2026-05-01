import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-watcher.js';

describe('jira remove-watcher tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-watcher',
        Model: 'ActionOutput_jira_removewatcher'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
