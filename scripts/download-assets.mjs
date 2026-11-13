import { mkdir, writeFile, readFile } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
const seed = await readFile('prisma/seed.ts', 'utf8');
const ids = [
  ...new Set([...seed.matchAll(/photo-[\d]+-[a-z\d]+/g)].map((m) => m[0])),
  'photo-1483985988355-763728e1935b',
  'photo-1445205170230-053b83016050',
];
await Promise.all(
  ids.map(async (id) => {
    const actual = id === 'photo-1548624149-f3221d722dca' ? 'photo-1539533018447-63fcce2678e3' : id;
    const url = `https://images.unsplash.com/${actual}?auto=format&fit=crop&w=1600&q=85&sat=-60`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${id}: ${response.status}`);
    await writeFile(`public/images/${id}.jpg`, Buffer.from(await response.arrayBuffer()));
    console.log(`Saved ${id}`);
  }),
);
