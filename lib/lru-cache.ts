export function createLRUCache<K, V>(maxSize: number) {
  const map = new Map<K, V>();

  function get(key: K): V | undefined {
    const value = map.get(key);
    if (value !== undefined) {
      map.delete(key);
      map.set(key, value);
    }
    return value;
  }

  function set(key: K, value: V) {
    if (map.has(key)) {
      map.delete(key);
    }
    map.set(key, value);
    if (map.size > maxSize) {
      const firstKey = map.keys().next().value;
      if (firstKey !== undefined) {
        map.delete(firstKey);
      }
    }
  }

  function clear() {
    map.clear();
  }

  return {
    get,
    set,
    clear,
  };
}


