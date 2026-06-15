import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-form-records.js';

describe('zoho-people list-form-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-form-records',
        Model: 'ActionOutput_zoho_people_listformrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
