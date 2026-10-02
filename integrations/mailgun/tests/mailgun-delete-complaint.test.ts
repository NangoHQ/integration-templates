import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-complaint.js';

describe('mailgun delete-complaint tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-complaint',
        Model: 'ActionOutput_mailgun_deletecomplaint'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
