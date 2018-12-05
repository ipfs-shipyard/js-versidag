import hashObj from 'hash-obj';
import createVersidag from '../../src';

const createInMemoryVersidag = (headCids, config) => {
    if (!Array.isArray(headCids)) {
        config = headCids;
        headCids = [];
    }

    const storage = new Map();

    config = {
        tieBreaker: (node1, node2) => node1.meta - node2.meta,
        readNode: (cid) => Promise.resolve(storage.get(cid)),
        writeNode: (node) => {
            const cid = hashObj(node, { algorithm: 'md5' });

            storage.set(cid, node);

            return Promise.resolve(cid);
        },
        ...config,
    };

    return createVersidag(headCids, config);
};

export default createInMemoryVersidag;
