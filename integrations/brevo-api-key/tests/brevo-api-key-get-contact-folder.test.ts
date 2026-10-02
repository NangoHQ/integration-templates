import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact-folder.js';

describe('brevo-api-key get-contact-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact-folder',
        Model: 'ActionOutput_brevo_api_key_getcontactfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
