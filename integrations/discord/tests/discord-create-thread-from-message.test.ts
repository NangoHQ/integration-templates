import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-thread-from-message.js';

describe('discord create-thread-from-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-thread-from-message',
        Model: 'ActionOutput_discord_createthreadfrommessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
