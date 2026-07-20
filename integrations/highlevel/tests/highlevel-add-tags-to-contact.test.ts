import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-tags-to-contact.js';

describe('highlevel add-tags-to-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-tags-to-contact',
        Model: 'ActionOutput_highlevel_addtagstocontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
