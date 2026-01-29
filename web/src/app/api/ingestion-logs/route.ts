import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/ingestion-logs - Get recent ingestion logs
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    
    let query = `
      SELECT 
        il.*,
        ds.title as source_title,
        ds.domain as source_domain,
        ds.data_type
      FROM ingestion_logs il
      LEFT JOIN data_sources ds ON il.data_source_id = ds.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' AND il.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY il.started_at DESC LIMIT ?';
    params.push(limit);
    
    const result = await db.execute({
      sql: query,
      args: params
    });
    
    return NextResponse.json({
      logs: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching ingestion logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
