import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-filters.js';

describe('google-mail list-filters tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-filters',
        Model: 'ActionOutput_google_mail_listfilters'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
