// ==============================================================================
// file_id: SOM-API-0003-v1.0.0
// name: route.ts
// description: Financials API - query financial data from database
// project_id: HIPPOCRATIC
// category: api
// tags: [api, financials, database]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const facilityId = searchParams.get('facilityId');
    const limit = parseInt(searchParams.get('limit') || '1000');
    
    let query = 'SELECT * FROM financials';
    const args: any[] = [];
    
    if (facilityId) {
      query += ' WHERE facility_id = ?';
      args.push(facilityId);
    }
    
    query += ' LIMIT ?';
    args.push(limit);
    
    const result = await db.execute({ sql: query, args });
    
    const financials = result.rows.map((row: any) => ({
      id: row.id,
      facilityId: row.facility_id,
      oshpdId: row.oshpd_id,
      facilityName: row.facility_name,
      licenseNumber: row.license_number,
      year: row.year,
      totalRevenue: row.total_revenue,
      totalExpenses: row.total_expenses,
      netIncome: row.net_income,
      totalVisits: row.total_visits,
      totalPatients: row.total_patients,
      revenuePerVisit: row.revenue_per_visit,
    }));
    
    return NextResponse.json({ financials, count: financials.length });
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { financials } = body;
    
    if (!Array.isArray(financials)) {
      return NextResponse.json(
        { error: 'financials must be an array' },
        { status: 400 }
      );
    }
    
    let inserted = 0;
    
    for (const f of financials) {
      try {
        await db.execute({
          sql: `
            INSERT INTO financials (
              facility_id, oshpd_id, facility_name, license_number, year,
              total_revenue, total_expenses, net_income, total_visits
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            f.facilityId || null,
            f.oshpdId || null,
            f.facilityName || null,
            f.licenseNumber || null,
            f.year || new Date().getFullYear(),
            f.totalRevenue || 0,
            f.totalExpenses || 0,
            f.netIncome || 0,
            f.totalVisits || 0,
          ],
        });
        inserted++;
      } catch (err) {
        console.error(`Error inserting financial record:`, err);
      }
    }
    
    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error('Financials POST error:', error);
    return NextResponse.json(
      { error: 'Failed to insert financials' },
      { status: 500 }
    );
  }
}
