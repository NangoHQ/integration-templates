import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reply-to-message.js';

describe('outlook reply-to-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reply-to-message',
        Model: 'ActionOutput_outlook_replytomessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
