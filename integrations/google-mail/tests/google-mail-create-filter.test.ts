import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-filter.js';

describe('google-mail create-filter tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-filter',
        Model: 'ActionOutput_google_mail_createfilter'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
