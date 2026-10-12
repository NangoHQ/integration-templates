import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact-360.js';

describe('zoho-bigin get-contact-360 tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact-360',
        Model: 'ActionOutput_zoho_bigin_getcontact360'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
