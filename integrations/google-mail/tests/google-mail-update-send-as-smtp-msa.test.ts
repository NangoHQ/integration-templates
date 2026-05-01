import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-send-as-smtp-msa.js';

describe('google-mail update-send-as-smtp-msa tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-send-as-smtp-msa',
        Model: 'ActionOutput_google_mail_updatesendassmtpmsa'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
