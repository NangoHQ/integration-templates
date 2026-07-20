import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-payment.js';

describe('squareup create-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-payment',
        Model: 'ActionOutput_squareup_createpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
