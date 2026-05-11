import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reply-all-to-message.js';

describe('outlook reply-all-to-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reply-all-to-message',
        Model: 'ActionOutput_outlook_replyalltomessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
