import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/budget-stats - Get budget data statistics
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get total budget records
    const budgetCount = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM government_budgets',
      args: []
    });
    
    // Get total healthcare spending
    const healthcareSpending = await db.execute({
      sql: `
        SELECT 
          SUM(actual_amount) as total,
          COUNT(*) as record_count
        FROM government_budgets 
        WHERE category = 'Healthcare' OR department LIKE '%HEALTH%'
      `,
      args: []
    });
    
    // Get facility payments count
    const paymentsCount = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM facility_payments',
      args: []
    });
    
    // Get recent budget records by department
    const recentByDept = await db.execute({
      sql: `
        SELECT 
          department,
          SUM(actual_amount) as total_amount,
          COUNT(*) as record_count
        FROM government_budgets
        WHERE actual_amount > 0
        GROUP BY department
        ORDER BY total_amount DESC
        LIMIT 10
      `,
      args: []
    });
    
    // Get budget documents status
    const documentsStatus = await db.execute({
      sql: `
        SELECT 
          parse_status,
          COUNT(*) as count
        FROM budget_documents
        GROUP BY parse_status
      `,
      args: []
    });
    
    return NextResponse.json({
      totalBudgetRecords: (budgetCount.rows[0] as any)?.count || 0,
      healthcareSpending: {
        total: (healthcareSpending.rows[0] as any)?.total || 0,
        recordCount: (healthcareSpending.rows[0] as any)?.record_count || 0
      },
      facilityPayments: (paymentsCount.rows[0] as any)?.count || 0,
      topDepartments: recentByDept.rows,
      documentStatus: documentsStatus.rows
    });
    
  } catch (error) {
    console.error('Error fetching budget stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget statistics' },
      { status: 500 }
    );
  }
}
