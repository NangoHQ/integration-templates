import { expect, it, describe } from 'vitest';

import createAction from '../actions/read-record.js';

describe('odoo-api-key read-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'read-record',
        Model: 'ActionOutput_odoo_api_key_readrecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
