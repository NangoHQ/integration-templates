import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-mural-member-permissions.js';

describe('mural update-mural-member-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-mural-member-permissions',
        Model: 'ActionOutput_mural_updatemuralmemberpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
