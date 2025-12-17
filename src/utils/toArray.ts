function toArray<T>(
    value: unknown,
    type?: string | null,
    fn?: (...args: unknown[]) => boolean | null,
    throwErrorIfFoundUnvalidType?: boolean | null
): T[] {
    let vReturn = !Array.isArray(value) ? [value] : value;

    if (type && throwErrorIfFoundUnvalidType) {
        if (vReturn.some((v) => typeof v !== type)) {
            throw new TypeError(`Expected type '${type}'`);
        }
    }
    if (type && !throwErrorIfFoundUnvalidType) {
        vReturn = vReturn.filter((v) => typeof v === type);
    }
    if (typeof fn === 'function') {
        vReturn = vReturn.filter(fn);
    }

    return vReturn;
}

export default toArray;
