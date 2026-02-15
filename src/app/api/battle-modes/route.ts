import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'battleModes.json');

function getModes() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveModes(modes: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(modes, null, 2));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeId = searchParams.get('mode');
  
  const modes = getModes();

  if (modeId) {
    if (modes[modeId]) {
      return NextResponse.json(modes[modeId]);
    }
    return NextResponse.json({ error: 'Mode not found' }, { status: 404 });
  }

  return NextResponse.json(modes);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Mode ID is required' }, { status: 400 });
    }

    const modes = getModes();
    modes[id] = { id, ...data };
    
    saveModes(modes);

    return NextResponse.json({ success: true, mode: modes[id] });
  } catch (error) {
    console.error('Error saving battle mode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
