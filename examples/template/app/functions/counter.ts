let count = 0;

export async function incrementCounter(): Promise<number> {
  count += 1;
  return count;
}

export async function decrementCounter(): Promise<number> {
  count -= 1;
  return count;
}

export async function getCounter(): Promise<number> {
  return count;
}
