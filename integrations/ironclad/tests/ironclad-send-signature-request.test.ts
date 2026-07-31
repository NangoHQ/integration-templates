import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-signature-request.js';

describe('ironclad send-signature-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-signature-request',
        Model: 'ActionOutput_ironclad_sendsignaturerequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
