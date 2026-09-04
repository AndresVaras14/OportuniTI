export const OPPORTUNITIES_PER_PAGE = 30;

export function getPagination(total, requestedPage = 1) {
  const totalPages = Math.max(1, Math.ceil(total / OPPORTUNITIES_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, Math.trunc(requestedPage) || 1));
  const startIndex = (page - 1) * OPPORTUNITIES_PER_PAGE;
  const endIndex = Math.min(startIndex + OPPORTUNITIES_PER_PAGE, total);
  return { page, totalPages, startIndex, endIndex };
}
