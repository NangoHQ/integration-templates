import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-rule.js';

describe('algolia create-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-rule',
        Model: 'ActionOutput_algolia_createrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
