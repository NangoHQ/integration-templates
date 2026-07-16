import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-group-suppressions.js';

describe('sendgrid add-group-suppressions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-group-suppressions',
        Model: 'ActionOutput_sendgrid_addgroupsuppressions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
