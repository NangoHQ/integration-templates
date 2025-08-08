import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/update-opportunity-sources.js';

describe('lever update-opportunity-sources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity-sources',
        Model: 'SuccessResponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
