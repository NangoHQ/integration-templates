import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-suppressions.js';

describe('sendgrid list-group-suppressions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-suppressions',
        Model: 'ActionOutput_sendgrid_listgroupsuppressions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
