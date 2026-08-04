import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-user-invitation.js';

describe('datadog send-user-invitation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-user-invitation',
        Model: 'ActionOutput_datadog_senduserinvitation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
