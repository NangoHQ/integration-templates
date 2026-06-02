import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-styles.js';

describe('figma list-styles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-styles',
        Model: 'ActionOutput_figma_liststyles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
