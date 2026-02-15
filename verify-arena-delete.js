const baseUrl = 'http://localhost:3000/api/arenas';

async function test() {
  try {
    // 1. Create
    console.log('Creating dummy arena...');
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Me',
        image: '',
        environment: 'Neutral',
        difficulty: { space: 50, magic: 50, complexity: 50 }
      })
    });
    
    if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`Create failed: ${createRes.status} - ${text}`);
    }
    const created = await createRes.json();
    console.log('Created:', created.id);

    // 2. Delete
    console.log('Deleting arena...');
    const deleteRes = await fetch(`${baseUrl}/${created.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteRes.ok) {
        const text = await deleteRes.text();
        throw new Error(`Delete failed: ${deleteRes.status} - ${text}`);
    }
    console.log('Deleted successfully');

    // 3. Verify
    const checkRes = await fetch(`${baseUrl}/${created.id}`);
    if (checkRes.status === 404) {
      console.log('Verification success: Arena not found');
    } else {
      console.error('Verification failed: Arena still exists');
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();