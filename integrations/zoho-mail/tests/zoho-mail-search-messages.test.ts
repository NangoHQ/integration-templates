import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-messages.js';

describe('zoho-mail search-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-messages',
        Model: 'ActionOutput_zoho_mail_searchmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
