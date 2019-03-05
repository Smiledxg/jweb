import * as Hoek from "hoek";
import { getObjectType } from '../utils';

const PrimaryTypes = ['boolean', 'number', 'string'];

export default class ReqRes {

  private data;

  constructor () {
  }

  public append (data: any): void {
    if (data === null || data === undefined) {
      return;
    }
    if (this.data === null || this.data === undefined) {
      this.data = data;
    } else {
      let dataType = typeof data;
      if (Array.isArray(data)) {
        this.data = this.data.concat(data);
      } else if (PrimaryTypes.indexOf(dataType) >= 0) {
        this.data = data;
      } else {
        Hoek.merge(this.data, data);
      }
    }
  }

  public setData (data: any): void {
    this.data = data;
  }

  public getData (key?: string) {
    if (key && getObjectType(key) === 'object') {
      return this.data[key];
    } else {
      return this.data;
    }
  }
}