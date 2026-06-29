import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-subscriber.js';

describe('bigcommerce create-subscriber tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-subscriber',
        Model: 'ActionOutput_bigcommerce_createsubscriber'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
