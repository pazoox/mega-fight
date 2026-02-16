import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    const maxSizeBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { success: false, message: 'File too large. Please upload a video under 20MB.' },
        { status: 413 }
      );
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') || 'arena-video';
    const filename = `${uniqueSuffix}-${safeName}`;

    const bucket = 'backgrounds';
    const filePath = `arenas/${filename}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError || !uploadData?.path) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const url = publicUrlData?.publicUrl;

    if (!url) {
      return NextResponse.json({ success: false, message: 'Failed to generate public URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
  }
}
