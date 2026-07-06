import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-connection-name.js';

describe('make update-connection-name tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-connection-name',
        Model: 'ActionOutput_make_updateconnectionname'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
