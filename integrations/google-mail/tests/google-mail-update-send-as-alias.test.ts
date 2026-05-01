import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-send-as-alias.js';

describe('google-mail update-send-as-alias tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-send-as-alias',
        Model: 'ActionOutput_google_mail_updatesendasalias'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
