import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-message-attachment.js';

describe('outlook download-message-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-message-attachment',
        Model: 'ActionOutput_outlook_downloadmessageattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
