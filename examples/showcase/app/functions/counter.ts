let count = 0;

export function incrementCounter() {
  count += 1;
  return count;
}

export function decrementCounter() {
  count -= 1;
  return count;
}

export function getCounter() {
  return count;
}
