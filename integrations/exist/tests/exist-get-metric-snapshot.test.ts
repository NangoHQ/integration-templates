import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-metric-snapshot.js';

describe('exist get-metric-snapshot tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-metric-snapshot',
        Model: 'ActionOutput_exist_getmetricsnapshot'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
