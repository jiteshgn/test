import * as React from 'react';
import { DEFAULT_SORT, ICourse } from '../models/ICourse';
import { ICourseService } from '../services/ICourseService';
import { sortCourses } from '../utils/courseUtils';

export interface IUseCoursesResult {
  loading: boolean;
  /** Message to show when loading failed, otherwise ''. */
  error: string;
  /** All classes, earliest first. */
  courses: ICourse[];
}

/**
 * Loads the classes from the data service (local list or SharePoint list).
 * Loads again when the service or dataKey changes (e.g. the data source is switched in the property pane).
 */
export function useCourses(dataService: ICourseService, dataKey: string): IUseCoursesResult {
  const [result, setResult] = React.useState<IUseCoursesResult>({ loading: true, error: '', courses: [] });

  React.useEffect(() => {
    // Ignore a response that arrives after the component unmounted or a newer load started.
    let cancelled: boolean = false;
    setResult((previous) => ({ ...previous, loading: true, error: '' }));

    dataService.getCourses().then(
      (courses: ICourse[]) => {
        if (!cancelled) {
          setResult({ loading: false, error: '', courses: sortCourses(courses, DEFAULT_SORT) });
        }
      },
      (e: unknown) => {
        if (!cancelled) {
          const message: string = e instanceof Error ? e.message : String(e);
          setResult({ loading: false, error: `The learning calendar could not be loaded. ${message}`, courses: [] });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [dataService, dataKey]);

  return result;
}
