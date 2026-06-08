import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-read-records.js';

describe('odoo-cc search-read-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-read-records',
        Model: 'ActionOutput_odoo_cc_searchreadrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
