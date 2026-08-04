import { z } from 'zod'

export const PageRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PageRequest = z.infer<typeof PageRequestSchema>

export const offsetOf = (request: PageRequest): number => (request.page - 1) * request.pageSize

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export const toPage = <T>(items: T[], request: PageRequest, totalItems: number): Page<T> => ({
  items,
  page: request.page,
  pageSize: request.pageSize,
  totalItems,
  totalPages: Math.ceil(totalItems / request.pageSize),
})
