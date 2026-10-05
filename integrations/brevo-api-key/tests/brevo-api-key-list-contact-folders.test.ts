import { expect, it, describe } from 'vitest';

import createAction from '../actions/list-contact-folders.js';

describe('brevo-api-key list-contact-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contact-folders',
        Model: 'ActionOutput_brevo_api_key_listcontactfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
