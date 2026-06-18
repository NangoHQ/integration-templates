import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customers.js';

describe('bigcommerce list-customers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customers',
        Model: 'ActionOutput_bigcommerce_listcustomers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
