import { expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-payment.js';

describe('squareup cancel-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-payment',
        Model: 'ActionOutput_squareup_cancelpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
