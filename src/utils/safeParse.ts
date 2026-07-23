export function safeParse<T>(jsonString: string | undefined | null, defaultData: T, migrator?: (parsed: any, defaultData: T) => T): T {
  try {
    if (!jsonString) return defaultData;
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return defaultData;
    
    if (migrator) {
      return migrator(parsed, defaultData);
    }
    
    // Shallow merge root properties. Arrays and nested objects from `parsed` will overwrite defaults.
    // Missing root properties in `parsed` will be populated by `defaultData`.
    return { ...defaultData, ...parsed };
  } catch (e) {
    console.warn('Failed to parse block content safely, falling back to default.', e);
    return defaultData;
  }
}
