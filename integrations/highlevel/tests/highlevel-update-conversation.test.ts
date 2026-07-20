import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-conversation.js';

describe('highlevel update-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-conversation',
        Model: 'ActionOutput_highlevel_updateconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
