import type { zh } from './zh'

/** 递归放宽：字符串 → string；数组元素递归放宽；对象递归放宽 */
type WidenDeep<T> = T extends string ? string : T extends object ? Widen<T> : T

type Widen<T> = {
  readonly [K in keyof T]: T[K] extends readonly (infer E)[] ? readonly WidenDeep<E>[] : WidenDeep<T[K]>
}

export type Dict = Widen<typeof zh>

/** 提取 Dict 的叶子路径（字符串与数组视为叶子） */
export type PathsOf<T> = T extends string | number | boolean | null | undefined | readonly unknown[]
  ? never
  : {
      [K in keyof T & string]: T[K] extends string | readonly unknown[]
        ? K
        : T[K] extends object
          ? `${K}.${PathsOf<T[K]>}`
          : never
    }[keyof T & string]
