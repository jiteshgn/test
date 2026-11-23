/** [0, 1, ..., count - 1]. Written without Array.from so it builds with SPFx's ES5 lib. */
export function range(count: number): number[] {
  const out: number[] = [];
  for (let i: number = 0; i < count; i++) {
    out.push(i);
  }
  return out;
}

/** The values of a Set as an array (no Array.from / spread, which need ES2015 lib or downlevelIteration). */
export function setToArray<T>(set: Set<T>): T[] {
  const out: T[] = [];
  set.forEach((value: T) => {
    out.push(value);
  });
  return out;
}
