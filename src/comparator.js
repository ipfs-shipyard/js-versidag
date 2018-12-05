import { wrap } from 'lodash';

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

const wrapComparator = (comparator) => wrap(comparator, (comparator, entry1, entry2) => {
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
    const result = comparator(node1, node2);

    if (result !== 0) {
        return -result;
    }

    // If they are equal, compare their cids so that it's deterministic
    return cidsComparator(cid1, cid2);
});

export default wrapComparator;
