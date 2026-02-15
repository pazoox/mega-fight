import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/tags.json');

async function getTags() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveTags(tags: string[]) {
  await fs.writeFile(dataFilePath, JSON.stringify(tags, null, 2));
}

export async function GET() {
  const tags = await getTags();
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  try {
    const { tag } = await request.json();
    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    const tags = await getTags();
    if (!tags.includes(tag)) {
      tags.push(tag);
      tags.sort();
      await saveTags(tags);
    }

    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
