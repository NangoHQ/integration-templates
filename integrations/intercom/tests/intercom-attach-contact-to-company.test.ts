import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/attach-contact-to-company.js';

describe('intercom attach-contact-to-company tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'attach-contact-to-company',
        Model: 'ActionOutput_intercom_attachcontacttocompany'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
