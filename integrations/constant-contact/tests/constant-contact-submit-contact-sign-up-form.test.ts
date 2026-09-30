import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-contact-sign-up-form.js';

describe('constant-contact submit-contact-sign-up-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-contact-sign-up-form',
        Model: 'ActionOutput_constant_contact_submitcontactsignupform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
