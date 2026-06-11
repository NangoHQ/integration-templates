import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-folder.js';

describe('zoho-mail delete-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-folder',
        Model: 'ActionOutput_zoho_mail_deletefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
