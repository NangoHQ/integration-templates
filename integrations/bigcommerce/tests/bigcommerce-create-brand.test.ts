import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-brand.js';

describe('bigcommerce create-brand tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-brand',
        Model: 'ActionOutput_bigcommerce_createbrand'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockResolvedValue({
            connection_config: { storeHash: 'hc5d9t2irc' },
            credentials: { access_token: 'fermiatee6aufil63xw3o6e85lo0wwx' }
        });
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
