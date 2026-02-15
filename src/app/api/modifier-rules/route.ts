import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/modifierRules.json');

async function getModifierRules() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading modifier rules:', error);
    return [];
  }
}

async function saveModifierRules(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const rules = await getModifierRules();
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  try {
    const newRule = await request.json();
    const currentRules = await getModifierRules();
    
    // Generate ID based on content
    const prefix = newRule.relationType === 'synergy' ? 'rule_synergy' : 'rule_versus';
    // Clean strings for ID
    const triggerVal = newRule.trigger.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetVal = newRule.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseId = `${prefix}_${triggerVal}_${targetVal}`;
    
    // Ensure uniqueness
    let finalId = baseId;
    let counter = 1;
    while (currentRules.some((r: any) => r.id === finalId)) {
        finalId = `${baseId}_${counter}`;
        counter++;
    }

    const ruleToSave = {
        id: finalId,
        ...newRule
    };
    // Keep relationType for explicit differentiation
    // delete ruleToSave.relationType;

    const updatedRules = [...currentRules, ruleToSave];
    await saveModifierRules(updatedRules);
    
    return NextResponse.json(ruleToSave);
  } catch (error) {
    console.error('Error saving modifier rules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const currentRules = await getModifierRules();
    const filteredRules = currentRules.filter((r: any) => r.id !== id);

    if (currentRules.length === filteredRules.length) {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await saveModifierRules(filteredRules);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting modifier rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
