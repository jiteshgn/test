import { ICourse } from '../models/ICourse';

/** A class without its list id (new item, Excel import). */
export type CourseInput = Pick<ICourse, Exclude<keyof ICourse, 'id'>>;

export interface ICourseService {
  getCourses(): Promise<ICourse[]>;
  /** Adds a class; resolves with it, including its new id. */
  addCourse(course: CourseInput): Promise<ICourse>;
  updateCourse(course: ICourse): Promise<void>;
  deleteCourse(id: string): Promise<void>;
}
