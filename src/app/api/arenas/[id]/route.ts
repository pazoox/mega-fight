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

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  const arenas = await getArenas();
  const arena = arenas.find((a) => a.id === id);

  if (!arena) {
    return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
  }

  return NextResponse.json(arena);
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  try {
    const updatedArena: Arena = await request.json();
    
    if (!updatedArena.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const arenas = await getArenas();
    const index = arenas.findIndex((a) => a.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
    }

    // Ensure ID doesn't change or is consistent
    updatedArena.id = id;
    
    arenas[index] = updatedArena;
    await saveArenas(arenas);

    return NextResponse.json(updatedArena);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  try {
    const arenas = await getArenas();
    const filteredArenas = arenas.filter((a) => a.id !== id);

    if (arenas.length === filteredArenas.length) {
      return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
    }

    await saveArenas(filteredArenas);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
