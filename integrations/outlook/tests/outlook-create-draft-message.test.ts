import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-draft-message.js';

describe('outlook create-draft-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-draft-message',
        Model: 'ActionOutput_outlook_createdraftmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
