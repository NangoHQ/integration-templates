import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vendor-credits.js';

describe('ramp-sandbox list-vendor-credits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vendor-credits',
        Model: 'ActionOutput_ramp_sandbox_listvendorcredits'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
