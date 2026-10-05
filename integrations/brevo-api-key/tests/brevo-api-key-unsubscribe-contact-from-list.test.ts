import { expect, it, describe } from 'vitest';

import createAction from '../actions/unsubscribe-contact-from-list.js';

describe('brevo-api-key unsubscribe-contact-from-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unsubscribe-contact-from-list',
        Model: 'ActionOutput_brevo_api_key_unsubscribecontactfromlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
