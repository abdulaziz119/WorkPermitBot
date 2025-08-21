export interface Pagination {
  current: number;
  previous: number;
  next: number;
  perPage: number;
  totalPage: number;
  totalItem: number;
}

export interface PaginationResponse<T> {
  pagination: Pagination;
  result: T;
}
