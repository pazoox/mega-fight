 import { NextResponse } from 'next/server';
 import fs from 'fs/promises';
 import path from 'path';
 
 const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'tournaments.json');
 
 async function getTournaments(): Promise<any[]> {
   try {
     const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
     return JSON.parse(data);
   } catch {
     return [];
   }
 }
 
 export async function GET(
   request: Request,
   props: { params: Promise<{ id: string }> }
 ) {
   const params = await props.params;
   const id = params.id;
   const items = await getTournaments();
   const found = items.find(i => i.id === id);
   if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
   return NextResponse.json(found);
 }
