import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact.js';

describe('brevo-api-key get-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact',
        Model: 'ActionOutput_brevo_api_key_getcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
