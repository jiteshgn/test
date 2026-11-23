import { ICourse } from '../models/ICourse';
import { CourseInput, ICourseService } from './ICourseService';
import { LOCAL_COURSES } from '../data/localCourses';

/**
 * Serves the bundled sample data (transcribed from the Excel export) so the
 * web part can be tested without a SharePoint list.
 * Changes made in the admin panel are kept in memory until the page is reloaded.
 */
export class LocalCourseService implements ICourseService {
  private readonly _delayMs: number;
  private _courses: ICourse[] = LOCAL_COURSES.map((c) => ({ ...c }));
  private _nextId: number = 1000;

  constructor(delayMs: number = 150) {
    this._delayMs = delayMs;
  }

  public getCourses(): Promise<ICourse[]> {
    return this._later(() => this._courses.map((c) => ({ ...c })));
  }

  public addCourse(course: CourseInput): Promise<ICourse> {
    return this._later(() => {
      const created: ICourse = { ...course, id: `local-${++this._nextId}` };
      this._courses.push(created);
      return { ...created };
    });
  }

  public updateCourse(course: ICourse): Promise<void> {
    return this._later(() => {
      this._courses[this._indexOf(course.id)] = { ...course };
    });
  }

  public deleteCourse(id: string): Promise<void> {
    return this._later(() => {
      this._courses.splice(this._indexOf(id), 1);
    });
  }

  private _indexOf(id: string): number {
    for (let i: number = 0; i < this._courses.length; i++) {
      if (this._courses[i].id === id) {
        return i;
      }
    }
    throw new Error('The item no longer exists.');
  }

  /** Runs the change after a short delay, like a network call. */
  private _later<T>(work: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(work());
        } catch (e) {
          reject(e);
        }
      }, this._delayMs);
    });
  }
}
