import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/detach-contact-from-company.js';

describe('intercom detach-contact-from-company tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'detach-contact-from-company',
        Model: 'ActionOutput_intercom_detachcontactfromcompany'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
