import { expect, it, describe } from 'vitest';

import createAction from '../actions/call-method.js';

describe('odoo-api-key call-method tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'call-method',
        Model: 'ActionOutput_odoo_api_key_callmethod'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
