import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-group-list-property.js';

describe('mixpanel remove-group-list-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-group-list-property',
        Model: 'ActionOutput_mixpanel_removegrouplistproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
