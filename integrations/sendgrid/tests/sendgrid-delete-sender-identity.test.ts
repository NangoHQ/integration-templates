import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sender-identity.js';

describe('sendgrid delete-sender-identity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sender-identity',
        Model: 'ActionOutput_sendgrid_deletesenderidentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
