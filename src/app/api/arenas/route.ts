import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Arena } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'arenas.json');

async function getArenas(): Promise<Arena[]> {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveArenas(arenas: Arena[]) {
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(arenas, null, 2), 'utf-8');
}

export async function GET() {
  const arenas = await getArenas();
  return NextResponse.json(arenas);
}

export async function POST(request: Request) {
  try {
    const newArena: Arena = await request.json();
    if (!newArena.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const arenas = await getArenas();
    
    // Simple ID gen
    if (!newArena.id) {
        newArena.id = newArena.name.toLowerCase().replace(/\s+/g, '-');
    }

    arenas.push(newArena);
    await saveArenas(arenas);
    return NextResponse.json(newArena);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
