import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-user-property.js';

describe('amplitude delete-user-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-user-property',
        Model: 'ActionOutput_amplitude_deleteuserproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
