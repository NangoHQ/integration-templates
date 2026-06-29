import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-channel-listings.js';

describe('bigcommerce list-channel-listings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-channel-listings',
        Model: 'ActionOutput_bigcommerce_listchannellistings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
