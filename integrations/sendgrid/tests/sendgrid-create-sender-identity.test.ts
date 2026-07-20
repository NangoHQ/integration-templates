import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sender-identity.js';

describe('sendgrid create-sender-identity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sender-identity',
        Model: 'ActionOutput_sendgrid_createsenderidentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
