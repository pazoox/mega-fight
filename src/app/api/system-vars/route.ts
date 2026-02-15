import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/systemVars.json');

async function getSystemVars() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading system vars:', error);
    return {};
  }
}

async function saveSystemVars(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const vars = await getSystemVars();
  return NextResponse.json(vars);
}

export async function POST(request: Request) {
  try {
    const newVars = await request.json();
    await saveSystemVars(newVars);
    return NextResponse.json({ success: true, data: newVars });
  } catch (error) {
    console.error('Error saving system vars:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
