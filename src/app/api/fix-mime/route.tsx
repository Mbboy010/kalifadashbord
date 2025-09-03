// app/api/fix-mime/route.ts
import { NextResponse } from 'next/server';
import { Client, Storage } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // ✅ Server key (secret, never public)

const storage = new Storage(client);

export async function POST(req: Request) {
  const { bucketId, fileId } = await req.json();

  try {
    await storage.updateFile(
      bucketId,
      fileId,
      [], // Optional: keep same permissions
      'application/vnd.android.package-archive' // ✅ Correct APK MIME
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MIME update failed:', error);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}