import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-rule.js';

describe('gorgias get-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-rule',
        Model: 'ActionOutput_gorgias_getrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
