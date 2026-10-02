import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-complaint.js';

describe('mailgun get-complaint tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-complaint',
        Model: 'ActionOutput_mailgun_getcomplaint'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
