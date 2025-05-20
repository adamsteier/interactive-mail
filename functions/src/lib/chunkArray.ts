/**
 * Splits an array into chunks of specified size
 * Used for Firestore batch operations to stay under the 500 operations limit
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  
  return result;
} 