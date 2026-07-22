import { expect, it, describe } from 'vitest';

import createAction from '../actions/count-records.js';

describe('odoo-api-key count-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'count-records',
        Model: 'ActionOutput_odoo_api_key_countrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
