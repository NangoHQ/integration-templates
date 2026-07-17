import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-tags-from-contact.js';

describe('highlevel remove-tags-from-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-tags-from-contact',
        Model: 'ActionOutput_highlevel_removetagsfromcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
