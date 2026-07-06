import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-opportunity-links.js';

describe('lever-basic update-opportunity-links tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity-links',
        Model: 'ActionOutput_lever_basic_updateopportunitylinks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
