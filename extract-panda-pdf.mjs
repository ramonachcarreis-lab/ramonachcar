import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const pdfPath =
  process.argv[2] ||
  String.raw`c:\Users\USER\Downloads\CATÁLOGO PRODUTOS PANDA (3).pdf`;
const outDir =
  process.argv[3] ||
  path.join(process.cwd(), 'scripts', 'panda-pages');

fs.mkdirSync(outDir, { recursive: true });

const buf = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: buf });
const shots = await parser.getScreenshot({ imageBuffer: true, scale: 2 });
await parser.destroy();

for (let i = 0; i < shots.pages.length; i++) {
  const page = shots.pages[i];
  const file = path.join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`);
  fs.writeFileSync(file, Buffer.from(page.data));
  console.log('wrote', file, page.width, 'x', page.height);
}

console.log('total pages:', shots.pages.length);
