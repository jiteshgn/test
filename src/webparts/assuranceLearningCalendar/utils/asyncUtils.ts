export interface ITaskFailure {
  /** Index of the item that failed. */
  index: number;
  message: string;
}

/**
 * Runs `worker` for every item with at most `limit` running at once
 * (keeps SharePoint from throttling bulk imports and deletes).
 * Resolves with the failures; it never rejects.
 */
export function runWithLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void
): Promise<ITaskFailure[]> {
  const failures: ITaskFailure[] = [];
  let next: number = 0;
  let done: number = 0;

  return new Promise<ITaskFailure[]>((resolve) => {
    if (items.length === 0) {
      resolve(failures);
      return;
    }
    const startNext = (): void => {
      if (next >= items.length) {
        return;
      }
      const index: number = next++;
      worker(items[index], index)
        .then(
          () => undefined,
          (e: unknown) => {
            failures.push({ index, message: errorMessage(e) });
          }
        )
        .then(() => {
          done++;
          if (onProgress) {
            onProgress(done, items.length);
          }
          if (done === items.length) {
            failures.sort((a, b) => a.index - b.index);
            resolve(failures);
          } else {
            startNext();
          }
        });
    };
    for (let i: number = 0; i < Math.min(limit, items.length); i++) {
      startNext();
    }
  });
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
