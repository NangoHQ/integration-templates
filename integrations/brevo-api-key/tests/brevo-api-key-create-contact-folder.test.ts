import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contact-folder.js';

describe('brevo-api-key create-contact-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact-folder',
        Model: 'ActionOutput_brevo_api_key_createcontactfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
