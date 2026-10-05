import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact.js';

describe('constant-contact get-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact',
        Model: 'ActionOutput_constant_contact_getcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
