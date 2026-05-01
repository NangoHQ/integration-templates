import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-send-as-alias.js';

describe('google-mail get-send-as-alias tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-send-as-alias',
        Model: 'ActionOutput_google_mail_getsendasalias'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
