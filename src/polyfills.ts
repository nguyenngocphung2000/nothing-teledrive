/**
 * Phải import file này TRƯỚC mọi module dùng GramJS / Buffer / process.
 * Nhiều dependency (crypto-browserify, stream, gramjs) tham chiếu `process`
 * giống Node — trình duyệt không có sẵn → gán lên globalThis.
 */
import { Buffer } from 'buffer'
import process from 'process'

const g = globalThis as unknown as {
  Buffer?: typeof Buffer
  process?: typeof process
}

if (g.Buffer === undefined) {
  g.Buffer = Buffer
}
if (g.process === undefined) {
  g.process = process
}
