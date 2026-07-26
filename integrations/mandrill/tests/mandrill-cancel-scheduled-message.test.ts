import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-scheduled-message.js';

describe('mandrill cancel-scheduled-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-scheduled-message',
        Model: 'ActionOutput_mandrill_cancelscheduledmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
