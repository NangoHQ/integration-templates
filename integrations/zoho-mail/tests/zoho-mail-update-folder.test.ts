import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-folder.js';

describe('zoho-mail update-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-folder',
        Model: 'ActionOutput_zoho_mail_updatefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
