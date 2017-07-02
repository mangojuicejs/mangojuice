import { Utils } from 'mangojuice-core';
import Data from 'mangojuice-data';


export type Model<T> = {
  state: 'Typing' | 'Validating',
  error: string,
  value: T,
  initialValue: T,
  for: string,
  touched: boolean,
  valid: boolean,
  focused: boolean,
  options: Data.Model<any>,
  __field: boolean
};

export const createModel = <T>(initialValue: T, forId?: string): Model<T> => ({
  initialValue,
  state: 'Typing',
  error: '',
  value: initialValue,
  focused: false,
  valid: false,
  for: forId || `field_${Utils.nextId()}`,
  touched: false,
  options: Data.createModel(),
  __field: true
});
