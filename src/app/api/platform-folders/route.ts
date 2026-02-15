import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'platformFolders.json');

export interface PlatformFolder {
  id: string;
  name: string;
}

async function getFolders(): Promise<PlatformFolder[]> {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveFolders(folders: PlatformFolder[]) {
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(folders, null, 2), 'utf-8');
}

export async function GET() {
  const folders = await getFolders();
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const folders = await getFolders();
    const newFolder = {
      id: body.name.toLowerCase().replace(/\s+/g, '-'),
      name: body.name
    };

    if (folders.some(f => f.id === newFolder.id)) {
        return NextResponse.json({ error: 'Folder already exists' }, { status: 400 });
    }

    folders.push(newFolder);
    await saveFolders(folders);
    return NextResponse.json(newFolder);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
