export function areFilterStatesEqual<TFilter>(left: TFilter, right: TFilter) {
  return JSON.stringify(left) === JSON.stringify(right);
}
