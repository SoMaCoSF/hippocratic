import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/data-sources - List all tracked data sources
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const dataType = searchParams.get('data_type');
    const status = searchParams.get('status');
    
    let query = 'SELECT * FROM data_sources WHERE 1=1';
    const params: any[] = [];
    
    if (dataType) {
      query += ' AND data_type = ?';
      params.push(dataType);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY priority DESC, title ASC';
    
    const result = await db.execute({
      sql: query,
      args: params
    });
    
    return NextResponse.json({
      sources: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    );
  }
}

// POST /api/data-sources/trigger - Trigger data fetch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, action } = body;
    
    // In production, this would trigger a background job
    // For now, return instructions for manual execution
    
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM data_sources WHERE id = ?',
      args: [sourceId]
    });
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }
    
    const source = result.rows[0] as any;
    
    return NextResponse.json({
      message: 'Trigger received',
      source: source,
      instructions: {
        command: action === 'scrape' 
          ? `python data_sources/scrape_${source.domain.split('.')[0]}.py`
          : `python data_sources/fetch_${source.domain.split('.')[0]}_data.py`,
        description: `Run this command to fetch data from ${source.title}`
      }
    });
    
  } catch (error) {
    console.error('Error triggering data fetch:', error);
    return NextResponse.json(
      { error: 'Failed to trigger fetch' },
      { status: 500 }
    );
  }
}
