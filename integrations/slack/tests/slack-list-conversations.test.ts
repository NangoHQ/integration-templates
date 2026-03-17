import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conversations.js';

describe('slack list-conversations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-conversations',
        Model: 'ActionOutput_slack_listconversations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
