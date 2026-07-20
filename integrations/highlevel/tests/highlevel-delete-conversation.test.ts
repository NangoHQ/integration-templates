import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-conversation.js';

describe('highlevel delete-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-conversation',
        Model: 'ActionOutput_highlevel_deleteconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
