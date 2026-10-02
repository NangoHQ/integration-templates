import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contact-attributes.js';

describe('brevo-api-key list-contact-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contact-attributes',
        Model: 'ActionOutput_brevo_api_key_listcontactattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
