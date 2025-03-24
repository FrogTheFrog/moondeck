import { BehaviorSubject, Observable } from "rxjs";
import { AppType } from "./steamutils";

interface _StateData {
  purge: boolean;
  appType: AppType;
  count: number;
  max: number | null;
}

export class StateData {
  constructor(public data: _StateData | null) {
  }

  get syncing(): boolean {
    return this.data !== null;
  }

  formatText(purge: boolean, appType: AppType, text: string): string {
    if (this.data && this.data.appType === appType && this.data.purge === purge && this.data.max !== null) {
      return `${this.data.count}/${this.data.max}`;
    }
    return text;
  }
}

export class AppSyncState {
  private readonly data = new BehaviorSubject(new StateData(null));

  asObservable(): Observable<StateData> {
    return this.data.asObservable();
  }

  getState(): Readonly<StateData> {
    return this.data.value;
  }

  setState(purge: boolean, appType: AppType): void {
    this.data.next(new StateData({ purge, appType, count: 0, max: null }));
  }

  setMax(value: number): void {
    const currentValue = this.data.value.data;
    if (currentValue) {
      this.data.next(new StateData({ ...currentValue, max: value }));
    }
  }

  incrementCount(): void {
    const currentValue = this.data.value.data;
    if (currentValue) {
      this.data.next(new StateData({ ...currentValue, count: currentValue.count + 1 }));
    }
  }

  resetState(): void {
    this.data.next(new StateData(null));
  }
}
