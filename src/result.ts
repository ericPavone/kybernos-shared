export interface ResultMessage {
  code: string
  message: string
}

export interface Result<T> {
  data: T | null
  errors: ResultMessage[]
  warnings: ResultMessage[]
  status: number
}

export const ok = <T>(data: T, status = 200, warnings: ResultMessage[] = []): Result<T> => ({
  data,
  errors: [],
  warnings,
  status,
})

export const fail = <T = never>(status: number, errors: ResultMessage[]): Result<T> => ({
  data: null,
  errors,
  warnings: [],
  status,
})

export const mapResult = <T, U>(result: Result<T>, fn: (data: T) => U): Result<U> => ({
  ...result,
  data: result.data === null ? null : fn(result.data),
})

// un Result<null> ha `data: null` anche quando è andato bene: l'esito sta
// negli errori, mai nel payload
export const isFail = (result: Result<unknown>): boolean => result.errors.length > 0
