import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-filter.js';

describe('google-mail delete-filter tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-filter',
        Model: 'ActionOutput_google_mail_deletefilter'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
