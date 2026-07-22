import { expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-record.js';

describe('odoo-api-key duplicate-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-record',
        Model: 'ActionOutput_odoo_api_key_duplicaterecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
