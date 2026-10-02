import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-complaint.js';

describe('mailgun create-complaint tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-complaint',
        Model: 'ActionOutput_mailgun_createcomplaint'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
