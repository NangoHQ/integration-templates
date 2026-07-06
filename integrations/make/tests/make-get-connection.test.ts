import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-connection.js';

describe('make get-connection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-connection',
        Model: 'ActionOutput_make_getconnection'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockResolvedValue({
            connection_config: {
                environmentUrl: 'eu1.make.com'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
