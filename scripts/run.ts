import { GET } from '../src/app/api/import/route';

async function run() {
  const res = await GET();
  const data = await res.json();
  console.log(data);
}

run();
