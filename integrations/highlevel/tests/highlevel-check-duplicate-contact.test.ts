import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-duplicate-contact.js';

describe('highlevel check-duplicate-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-duplicate-contact',
        Model: 'ActionOutput_highlevel_checkduplicatecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
