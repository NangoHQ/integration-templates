import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contact-field.js';

describe('freshdesk create-contact-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact-field',
        Model: 'ActionOutput_freshdesk_createcontactfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
