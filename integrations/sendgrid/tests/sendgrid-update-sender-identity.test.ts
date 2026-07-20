import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-sender-identity.js';

describe('sendgrid update-sender-identity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-sender-identity',
        Model: 'ActionOutput_sendgrid_updatesenderidentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
