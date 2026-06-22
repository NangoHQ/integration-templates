import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-design.js';

describe('canva get-design tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-design',
        Model: 'ActionOutput_canva_getdesign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
