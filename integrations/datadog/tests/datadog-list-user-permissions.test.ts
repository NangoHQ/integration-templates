import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-permissions.js';

describe('datadog list-user-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-permissions',
        Model: 'ActionOutput_datadog_listuserpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
