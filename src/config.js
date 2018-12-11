import PQueue from 'p-queue';
import { wrap } from 'lodash';

const symbol = Symbol.for('versidag-config');

const cidsComparator = (cid1, cid2) => {
    if (cid1 > cid2) {
        return -1; // 1 but in reverse
    }
    /* istanbul ignore else */
    if (cid1 < cid2) {
        return 1; // -1 but in reverse
    }

    /* istanbul ignore next */
    return 0;
};

const enhanceTieBreaker = (config) => wrap(config.tieBreaker, (tieBreaker, entry1, entry2) => {
    const { node: node1, cid: cid1 } = entry1;
    const { node: node2, cid: cid2 } = entry2;

    // Short-circuit if cid is the same
    if (cid1 === cid2) {
        return 0;
    }

    const hasMeta1 = node1.meta != null;
    const hasMeta2 = node2.meta != null;

    // Case in which we are comparing an entry without 'meta'
    // Entries without meta should be the first ones in the stack
    if (hasMeta1 && !hasMeta2) {
        return -1; // 1 but in reverse
    }
    if (!hasMeta1 && hasMeta2) {
        return 1; // 1 but in reverse
    }
    if (!hasMeta1 && !hasMeta2) {
        return cidsComparator(cid1, cid2);
    }

    // Use the user's comparator
    const result = tieBreaker(node1, node2);

    if (result !== 0) {
        return -result;
    }

    // If they are equal, compare their cids so that it's deterministic
    return cidsComparator(cid1, cid2);
});

const enhanceReadNode = (config) => {
    const { readNode, readConcurrency } = config;

    if (config.readConcurrency === Infinity) {
        return (cid) => Promise.resolve(readNode(cid, config));
    }

    const pQueue = new PQueue({ concurrency: readConcurrency });

    return (cid) => pQueue.add(() => readNode(cid, config));
};

const enhanceWriteNode = (config) => {
    const { writeNode, writeConcurrency } = config;

    if (config.writeConcurrency === Infinity) {
        return (cid) => Promise.resolve(writeNode(cid, config));
    }

    const pQueue = new PQueue({ concurrency: writeConcurrency });

    return (node) => pQueue.add(() => writeNode(node, config));
};

const getConfig = (config) => {
    if (config[symbol]) {
        return config;
    }

    // Create a new object to avoid mutating it
    config = {
        readTimeout: null,
        readConcurrency: Infinity,
        writeTimeout: null,
        writeConcurrency: Infinity,
        ...config,
    };

    config.readNode = enhanceReadNode(config);
    config.writeNode = enhanceWriteNode(config);
    config.tieBreaker = enhanceTieBreaker(config);

    Object.defineProperty(config, symbol, {
        value: true,
    });

    return config;
};

export default getConfig;
