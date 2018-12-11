import pMap from 'p-map';

const defaultAddToStack = (stack, entry) => stack.push(entry);

const createTraverser = (config) => async (headCids, iteratorFn, addToStackFn = defaultAddToStack) => {
    const stack = [];

    const expand = (cids, child) => pMap(cids, async (cid) => {
        const entry = {
            cid,
            node: await config.readNode(cid),
            childCid: child ? child.cid : null,
            headCid: child ? child.headCid : cid,
        };

        addToStackFn(stack, entry);
    });

    await expand(headCids, null);

    while (stack.length) {
        const entry = stack.shift();

        const stop = iteratorFn(entry, stack);

        if (stop) {
            break;
        }

        await expand(entry.node.parents, entry); // eslint-disable-line no-await-in-loop
    }
};

export default createTraverser;
