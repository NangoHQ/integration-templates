import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-mail.js';

describe('outlook send-mail tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-mail',
        Model: 'ActionOutput_outlook_sendmail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
