import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-record-fields.js';

describe('odoo-cc get-record-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-record-fields',
        Model: 'ActionOutput_odoo_cc_getrecordfields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
