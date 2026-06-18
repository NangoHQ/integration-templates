import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-subscriber.js';

describe('bigcommerce update-subscriber tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-subscriber',
        Model: 'ActionOutput_bigcommerce_updatesubscriber'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
