import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-message-attachment.js';

describe('outlook add-message-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-message-attachment',
        Model: 'ActionOutput_outlook_addmessageattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
