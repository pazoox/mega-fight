import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Challenge } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'src/data/challenges.json');

function getChallenges(): Challenge[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(fileContent);
  } catch (e) {
    return [];
  }
}

function saveChallenges(challenges: Challenge[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(challenges, null, 2));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const challenges = getChallenges();

  if (id) {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    return NextResponse.json(challenge);
  }

  return NextResponse.json(challenges);
}

export async function POST(req: NextRequest) {
  try {
    const newChallenge: Challenge = await req.json();
    const challenges = getChallenges();
    
    // Simple ID generation if not provided
    if (!newChallenge.id) {
      newChallenge.id = `challenge_${Date.now()}`;
    }
    
    newChallenge.createdAt = new Date().toISOString();
    
    challenges.push(newChallenge);
    saveChallenges(challenges);
    
    return NextResponse.json(newChallenge);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const updatedChallenge: Challenge = await req.json();
    const challenges = getChallenges();
    const index = challenges.findIndex(c => c.id === updatedChallenge.id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    
    challenges[index] = { ...challenges[index], ...updatedChallenge };
    saveChallenges(challenges);
    
    return NextResponse.json(challenges[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let challenges = getChallenges();
    const initialLength = challenges.length;
    challenges = challenges.filter(c => c.id !== id);

    if (challenges.length === initialLength) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    saveChallenges(challenges);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 });
  }
}
