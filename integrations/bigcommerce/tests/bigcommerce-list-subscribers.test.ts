import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-subscribers.js';

describe('bigcommerce list-subscribers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-subscribers',
        Model: 'ActionOutput_bigcommerce_listsubscribers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
