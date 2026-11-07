import { getNeonSql, isNeonConfigured } from "@/db/neon";
import { dbStore } from "@/db/store";

export interface ActiveSession {
  retailerId: string;
  userId: string;
  sessionId: string;
  phone: string;
  createdAt: Date;
  lastActiveAt: Date;
}

// In-memory cache of active retailer sessions
const inMemoryActiveSessions = new Map<string, ActiveSession>();

// Session timeout: 30 minutes of inactivity
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

let tableInitialized = false;

async function ensureActiveSessionsTable(): Promise<void> {
  if (tableInitialized || !isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS active_sessions (
        retailer_id VARCHAR(50) PRIMARY KEY,
        session_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    tableInitialized = true;
  } catch (err) {
    console.warn("Could not ensure active_sessions table in Neon:", err);
  }
}

/**
 * Attempt to acquire an exclusive active session lock for a Kirana store.
 * If another user is actively logged in for this retailerId, blocks access.
 */
export async function acquireRetailerSession(
  retailerId: string,
  userId: string,
  phone: string,
  force: boolean = false
): Promise<{
  allowed: boolean;
  sessionId?: string;
  error?: string;
  code?: string;
  activeSince?: Date;
}> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - SESSION_INACTIVITY_TIMEOUT_MS);

  if (force) {
    await forceReleaseRetailerSession(retailerId, phone);
  } else {
    // 1. Check in-memory cache first
    const cached = inMemoryActiveSessions.get(retailerId);
    if (cached && cached.lastActiveAt > cutoff) {
      return {
        allowed: false,
        error: "User already logged in",
        code: "USER_ALREADY_LOGGED_IN",
        activeSince: cached.createdAt,
      };
    }

    // 2. Check Neon database if configured (cross-instance Vercel check)
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        await ensureActiveSessionsTable();
        try {
          const rows = (await sql`
            SELECT * FROM active_sessions 
            WHERE retailer_id = ${retailerId}
            LIMIT 1;
          `) as any[];

          if (rows && rows.length > 0) {
            const row = rows[0];
            const lastActive = new Date(row.last_active_at || row.lastActiveAt);
            if (lastActive > cutoff) {
              // Populate in-memory cache so subsequent local checks are instant
              inMemoryActiveSessions.set(retailerId, {
                retailerId,
                userId: row.user_id,
                sessionId: row.session_id,
                phone: row.phone,
                createdAt: new Date(row.created_at),
                lastActiveAt: lastActive,
              });

              return {
                allowed: false,
                error: "User already logged in",
                code: "USER_ALREADY_LOGGED_IN",
                activeSince: new Date(row.created_at),
              };
            }
          }
        } catch (err) {
          console.warn("Active session lookup error in Neon:", err);
        }
      }
    }
  }

  // 3. Acquire the lock: create fresh session
  const newSessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
  const activeRecord: ActiveSession = {
    retailerId,
    userId,
    sessionId: newSessionId,
    phone,
    createdAt: now,
    lastActiveAt: now,
  };

  inMemoryActiveSessions.set(retailerId, activeRecord);

  // Persist to Neon
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`
          INSERT INTO active_sessions (retailer_id, session_id, user_id, phone, created_at, last_active_at)
          VALUES (${retailerId}, ${newSessionId}, ${userId}, ${phone}, ${now.toISOString()}, ${now.toISOString()})
          ON CONFLICT (retailer_id) DO UPDATE SET
            session_id = ${newSessionId},
            user_id = ${userId},
            phone = ${phone},
            created_at = ${now.toISOString()},
            last_active_at = ${now.toISOString()};
        `;
      } catch (err) {
        console.warn("Failed to persist active session in Neon:", err);
      }
    }
  }

  return {
    allowed: true,
    sessionId: newSessionId,
  };
}

/**
 * Release an active session lock for a Kirana store (called on logout)
 */
export async function releaseRetailerSession(
  retailerId: string,
  sessionId?: string
): Promise<void> {
  const cached = inMemoryActiveSessions.get(retailerId);
  if (!sessionId || (cached && cached.sessionId === sessionId)) {
    inMemoryActiveSessions.delete(retailerId);
  }

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        if (sessionId) {
          await sql`
            DELETE FROM active_sessions 
            WHERE retailer_id = ${retailerId} AND session_id = ${sessionId};
          `;
        } else {
          await sql`
            DELETE FROM active_sessions 
            WHERE retailer_id = ${retailerId};
          `;
        }
      } catch (err) {
        console.warn("Failed to delete active session from Neon:", err);
      }
    }
  }
}

/**
 * Force release session for a retailer (used when admin or owner overrides)
 */
export async function forceReleaseRetailerSession(retailerId: string, phone?: string): Promise<void> {
  inMemoryActiveSessions.delete(retailerId);
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        if (phone) {
          const clean = phone.replace(/\D/g, "").slice(-10);
          await sql`
            DELETE FROM active_sessions 
            WHERE retailer_id = ${retailerId} OR phone = ${clean};
          `;
        } else {
          await sql`
            DELETE FROM active_sessions 
            WHERE retailer_id = ${retailerId};
          `;
        }
      } catch (err) {
        console.warn("Failed to force delete active session from Neon:", err);
      }
    }
  }
}

/**
 * Touch active session to refresh lastActiveAt timestamp
 */
export async function touchRetailerSession(
  retailerId: string,
  sessionId?: string
): Promise<void> {
  const now = new Date();
  const cached = inMemoryActiveSessions.get(retailerId);
  if (cached && (!sessionId || cached.sessionId === sessionId)) {
    cached.lastActiveAt = now;
  }

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        if (sessionId) {
          await sql`
            UPDATE active_sessions 
            SET last_active_at = ${now.toISOString()}
            WHERE retailer_id = ${retailerId} AND session_id = ${sessionId};
          `;
        } else {
          await sql`
            UPDATE active_sessions 
            SET last_active_at = ${now.toISOString()}
            WHERE retailer_id = ${retailerId};
          `;
        }
      } catch {}
    }
  }
}
