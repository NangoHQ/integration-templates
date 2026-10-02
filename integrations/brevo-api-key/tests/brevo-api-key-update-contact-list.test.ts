import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-contact-list.js';

describe('brevo-api-key update-contact-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-contact-list',
        Model: 'ActionOutput_brevo_api_key_updatecontactlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
