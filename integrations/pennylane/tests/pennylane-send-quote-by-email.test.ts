import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-quote-by-email.js';

describe('pennylane send-quote-by-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-quote-by-email',
        Model: 'ActionOutput_pennylane_sendquotebyemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
