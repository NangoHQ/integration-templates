import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-credit-note.js';

describe('stripe get-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-credit-note',
        Model: 'ActionOutput_stripe_getcreditnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
