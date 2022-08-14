import { BehaviorSubject, Observable } from "rxjs";

export class ReadonlySubject<T> {
  protected readonly subject: BehaviorSubject<T>;

  constructor(subject: BehaviorSubject<T>) {
    this.subject = subject;
  }

  get value(): Readonly<T> {
    return this.subject.value;
  }

  asObservable(): Observable<Readonly<T>> {
    return this.subject.asObservable();
  }
}
