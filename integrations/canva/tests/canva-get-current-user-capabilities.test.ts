import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-current-user-capabilities.js';

describe('canva get-current-user-capabilities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-current-user-capabilities',
        Model: 'ActionOutput_canva_getcurrentusercapabilities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
