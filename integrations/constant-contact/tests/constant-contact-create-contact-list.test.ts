import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contact-list.js';

describe('constant-contact create-contact-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact-list',
        Model: 'ActionOutput_constant_contact_createcontactlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
