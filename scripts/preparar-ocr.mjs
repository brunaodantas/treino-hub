import { mkdir, copyFile } from 'node:fs/promises'
await mkdir('public/ocr', { recursive: true })
for (const [origem, nome] of [
 ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
 ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
 ['node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz', 'por.traineddata.gz'],
]) await copyFile(origem, `public/ocr/${nome}`)
