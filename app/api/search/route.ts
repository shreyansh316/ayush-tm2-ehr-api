import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, NamasteCodeRecord } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';

    // If q is empty, immediately return empty results
    if (!query) {
      return NextResponse.json(
        {
          success: true,
          count: 0,
          data: [],
        },
        { status: 200 }
      );
    }

    const supabase = getSupabase();

    // 1. First attempt the RPC function search_terminology
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'search_terminology',
      { search_term: query }
    );

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return NextResponse.json(
        {
          success: true,
          count: rpcData.length,
          data: rpcData as NamasteCodeRecord[],
        },
        { status: 200 }
      );
    }

    // 2. Direct table fallback search across all columns
    const { data: tableData, error: tableError } = await supabase
      .from('Namaste_code')
      .select('*')
      .or(
        `"Name English".ilike.%${query}%,"Hinglish".ilike.%${query}%,"Namc Term Devanagari".ilike.%${query}%,"TM2 Code".ilike.%${query}%,"Ayurveda Code".ilike.%${query}%`
      )
      .limit(50);

    if (tableError && rpcError) {
      console.error('Supabase query error:', tableError || rpcError);
      return NextResponse.json(
        {
          success: false,
          error: (tableError || rpcError).message,
          count: 0,
          data: [],
        },
        { status: 400 }
      );
    }

    const records = (tableData as NamasteCodeRecord[]) || (rpcData as NamasteCodeRecord[]) || [];

    return NextResponse.json(
      {
        success: true,
        count: records.length,
        data: records,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unhandled server error in /api/search:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal Server Error',
        count: 0,
        data: [],
      },
      { status: 500 }
    );
  }
}
