// ==============================================================================
// file_id: SOM-API-0001-v1.0.0
// name: route.ts
// description: Authentication API route for ingest page access
// project_id: HIPPOCRATIC
// category: api
// tags: [auth, email, password, api]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory store for auth tokens (in production, use Redis or database)
const authTokens = new Map<string, { email: string; expiresAt: number }>();
const pendingVerifications = new Map<string, { email: string; password: string; expiresAt: number }>();

// Authorized emails (in production, store in database)
const AUTHORIZED_EMAILS = process.env.AUTHORIZED_EMAILS?.split(',') || [
  'admin@hippocratic.app',
];

// Simple password hash (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate verification key
function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, verificationKey: providedKey } = body;

    // Verification flow
    if (providedKey) {
      const pending = pendingVerifications.get(providedKey);
      
      if (!pending) {
        return NextResponse.json(
          { error: 'Invalid or expired verification key' },
          { status: 400 }
        );
      }

      if (Date.now() > pending.expiresAt) {
        pendingVerifications.delete(providedKey);
        return NextResponse.json(
          { error: 'Verification key expired' },
          { status: 400 }
        );
      }

      // Create auth token
      const authToken = generateKey();
      authTokens.set(authToken, {
        email: pending.email,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      pendingVerifications.delete(providedKey);

      return NextResponse.json({
        success: true,
        token: authToken,
        email: pending.email,
      });
    }

    // Initial login flow
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Check if email is authorized
    if (!AUTHORIZED_EMAILS.includes(email)) {
      return NextResponse.json(
        { error: 'Unauthorized email address' },
        { status: 403 }
      );
    }

    // In production, verify password against database
    // For now, accept any password for authorized emails
    const hashedPassword = hashPassword(password);

    // Generate verification key
    const newVerificationKey = generateKey();
    pendingVerifications.set(newVerificationKey, {
      email,
      password: hashedPassword,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // In production, send email with verification key
    // For now, return it in response
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ingest?verify=${newVerificationKey}`;

    // Simulate email sending
    console.log(`
      ========================================
      VERIFICATION EMAIL
      ========================================
      To: ${email}
      Subject: Verify Your Hippocratic Access
      
      Click the link below to verify your access:
      ${verificationUrl}
      
      Or enter this key manually:
      ${newVerificationKey}
      
      This link expires in 15 minutes.
      ========================================
    `);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      verificationKey: newVerificationKey, // Remove this in production
      verificationUrl, // Remove this in production
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify token endpoint
export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 401 }
    );
  }

  const auth = authTokens.get(token);

  if (!auth) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }

  if (Date.now() > auth.expiresAt) {
    authTokens.delete(token);
    return NextResponse.json(
      { error: 'Token expired' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: auth.email,
  });
}
