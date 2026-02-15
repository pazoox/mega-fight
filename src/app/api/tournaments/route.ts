 import { NextResponse } from 'next/server';
 import fs from 'fs/promises';
 import path from 'path';
 import { randomUUID } from 'crypto';
 
 const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'tournaments.json');
 
 async function getTournaments(): Promise<any[]> {
   try {
     const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
     return JSON.parse(data);
   } catch {
     return [];
   }
 }
 
 async function saveTournaments(items: any[]) {
   await fs.writeFile(DATA_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
 }
 
 export async function GET() {
   const items = await getTournaments();
   return NextResponse.json(items);
 }
 
 export async function POST(request: Request) {
   try {
     const payload = await request.json();
     const id = randomUUID();
 
     const item = {
       id,
       status: 'active',
       created_at: new Date().toISOString(),
       ...payload
     };
 
     const items = await getTournaments();
     items.push(item);
     await saveTournaments(items);
 
     return NextResponse.json({ tournamentId: id });
   } catch (error: any) {
     return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
   }
 }
