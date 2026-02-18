import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Arena } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'arenas.json');

async function getArenas(): Promise<Arena[]> {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const onlyActive = searchParams.get('onlyActive') === 'true';
  const search = (searchParams.get('search') || '').toLowerCase();

  const arenas = await getArenas();

  const filtered = arenas.filter(a => {
    const byFolder = folder ? (a.folder || '') === folder : true;
    const bySearch = search ? (a.name?.toLowerCase().includes(search)) : true;
    const byActive = onlyActive ? true : true; // Arena type does not include isActive yet; default allow all
    return byFolder && bySearch && byActive;
  });

  const light = filtered.map(a => ({
    id: a.id,
    folder: a.folder || 'Uncategorized',
    name: a.name,
    image: a.image || '',
    video: a.video || '',
    environment: Array.isArray(a.environment) ? a.environment : [],
    isActive: true
  }));

  return NextResponse.json(light);
}
