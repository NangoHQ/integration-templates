import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-contact-attribute.js';

describe('brevo-api-key create-contact-attribute tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact-attribute',
        Model: 'ActionOutput_brevo_api_key_createcontactattribute'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
