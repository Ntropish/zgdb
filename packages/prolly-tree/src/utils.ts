export function bytesToNumber(bytes: Uint8Array): bigint {
  let number = 0n;
  for (let i = 0; i < bytes.length; i++) {
    number = (number << 8n) | BigInt(bytes[i]);
  }
  return number;
}
