import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-refunds.js';

describe('stripe list-refunds tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-refunds',
        Model: 'ActionOutput_stripe_listrefunds'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
