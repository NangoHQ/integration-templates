import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-contact-folder.js';

describe('brevo-api-key delete-contact-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-contact-folder',
        Model: 'ActionOutput_brevo_api_key_deletecontactfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
