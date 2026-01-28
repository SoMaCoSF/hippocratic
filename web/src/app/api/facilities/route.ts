// ==============================================================================
// file_id: SOM-API-0002-v1.0.0
// name: route.ts
// description: Facilities API - query facility data from database
// project_id: HIPPOCRATIC
// category: api
// tags: [api, facilities, database]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const county = searchParams.get('county');
    const inService = searchParams.get('inService');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = 'SELECT * FROM facilities WHERE 1=1';
    const args: any[] = [];
    
    if (category && category !== 'ALL') {
      query += ' AND category_name = ?';
      args.push(category);
    }
    
    if (county) {
      query += ' AND county = ?';
      args.push(county);
    }
    
    if (inService) {
      query += ' AND in_service = ?';
      args.push(inService === 'true' ? 1 : 0);
    }
    
    query += ' LIMIT ? OFFSET ?';
    args.push(limit, offset);
    
    const result = await db.execute({ sql: query, args });
    
    // Transform snake_case to camelCase
    const facilities = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      licenseNumber: row.license_number,
      categoryCode: row.category_code,
      categoryName: row.category_name,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      county: row.county,
      phone: row.phone,
      lat: row.lat,
      lng: row.lng,
      inService: row.in_service === 1,
      businessName: row.business_name,
      contactEmail: row.contact_email,
    }));
    
    return NextResponse.json({ facilities, count: facilities.length });
  } catch (error) {
    console.error('Facilities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { facilities } = body;
    
    if (!Array.isArray(facilities)) {
      return NextResponse.json(
        { error: 'facilities must be an array' },
        { status: 400 }
      );
    }
    
    let inserted = 0;
    
    for (const f of facilities) {
      try {
        await db.execute({
          sql: `
            INSERT INTO facilities (
              id, name, license_number, category_code, category_name,
              address, city, state, zip, county, phone,
              lat, lng, in_service, business_name, contact_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            f.id || crypto.randomUUID(),
            f.name || '',
            f.licenseNumber || null,
            f.categoryCode || null,
            f.categoryName || null,
            f.address || null,
            f.city || null,
            f.state || 'CA',
            f.zip || null,
            f.county || null,
            f.phone || null,
            f.lat || null,
            f.lng || null,
            f.inService ? 1 : 0,
            f.businessName || null,
            f.contactEmail || null,
          ],
        });
        inserted++;
      } catch (err) {
        console.error(`Error inserting facility ${f.id}:`, err);
      }
    }
    
    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error('Facilities POST error:', error);
    return NextResponse.json(
      { error: 'Failed to insert facilities' },
      { status: 500 }
    );
  }
}
