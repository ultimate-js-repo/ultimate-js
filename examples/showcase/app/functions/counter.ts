let count = 0;

export async function incrementCounter() {
  count += 1;
  return count;
}

export async function decrementCounter() {
  count -= 1;
  return count;
}

export async function getCounter() {
  return count;
}
