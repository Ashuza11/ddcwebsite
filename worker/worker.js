/**
 * DDC RDC — Cloudflare Worker (D1 Backend API)
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Wrangler: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Create D1 database: wrangler d1 create ddc-database
 * 4. Update wrangler.toml with the database ID
 * 5. Apply schema: wrangler d1 execute ddc-database --file=./schema.sql
 * 6. Deploy: wrangler deploy
 *
 * ENVIRONMENT BINDINGS (wrangler.toml):
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "ddc-database"
 *   database_id = "YOUR_DATABASE_ID"
 *
 *   [vars]
 *   JWT_SECRET = "your-secure-random-secret-here"
 *   CORS_ORIGIN = "https://your-domain.com"
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS headers
        const corsOrigin = env.CORS_ORIGIN || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        try {
            // ===== ROUTING =====

            // Public endpoints (no auth required)
            if (method === 'GET' && path === '/api/news') {
                return await getPublicNews(env.DB, corsHeaders);
            }
            if (method === 'GET' && path === '/api/events') {
                return await getPublicEvents(env.DB, corsHeaders);
            }
            if (method === 'GET' && path === '/api/publications') {
                return await getPublicPublications(env.DB, corsHeaders);
            }

            // Auth endpoint
            if (method === 'POST' && path === '/api/auth/login') {
                return await handleLogin(request, env, corsHeaders);
            }

            // Protected endpoints (require auth)
            const authResult = await verifyAuth(request, env);
            if (!authResult.valid) {
                return jsonResponse({ error: 'Non autorisé' }, 401, corsHeaders);
            }

            // ----- NEWS CRUD -----
            if (path.startsWith('/api/news')) {
                const id = extractId(path, '/api/news/');

                if (method === 'GET' && id) {
                    return await getById(env.DB, 'news', id, corsHeaders);
                }
                if (method === 'POST') {
                    return await createItem(request, env.DB, 'news', corsHeaders);
                }
                if (method === 'PUT' && id) {
                    return await updateItem(request, env.DB, 'news', id, corsHeaders);
                }
                if (method === 'DELETE' && id) {
                    return await deleteItem(env.DB, 'news', id, corsHeaders);
                }
            }

            // ----- EVENTS CRUD -----
            if (path.startsWith('/api/events')) {
                const id = extractId(path, '/api/events/');

                if (method === 'GET' && id) {
                    return await getById(env.DB, 'events', id, corsHeaders);
                }
                if (method === 'POST') {
                    return await createItem(request, env.DB, 'events', corsHeaders);
                }
                if (method === 'PUT' && id) {
                    return await updateItem(request, env.DB, 'events', id, corsHeaders);
                }
                if (method === 'DELETE' && id) {
                    return await deleteItem(env.DB, 'events', id, corsHeaders);
                }
            }

            // ----- PUBLICATIONS CRUD -----
            if (path.startsWith('/api/publications')) {
                const id = extractId(path, '/api/publications/');

                if (method === 'GET' && id) {
                    return await getById(env.DB, 'publications', id, corsHeaders);
                }
                if (method === 'POST') {
                    return await createItem(request, env.DB, 'publications', corsHeaders);
                }
                if (method === 'PUT' && id) {
                    return await updateItem(request, env.DB, 'publications', id, corsHeaders);
                }
                if (method === 'DELETE' && id) {
                    return await deleteItem(env.DB, 'publications', id, corsHeaders);
                }
            }

            return jsonResponse({ error: 'Route non trouvée' }, 404, corsHeaders);

        } catch (err) {
            console.error('Worker error:', err);
            return jsonResponse({ error: 'Erreur serveur interne' }, 500, corsHeaders);
        }
    }
};


// =========================================
// AUTH HELPERS
// =========================================

async function handleLogin(request, env, corsHeaders) {
    const { username, password } = await request.json();

    if (!username || !password) {
        return jsonResponse({ error: 'Identifiants requis' }, 400, corsHeaders);
    }

    // Hash the password with SHA-256 for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const user = await env.DB.prepare(
        'SELECT id, username FROM admin_users WHERE username = ? AND password_hash = ?'
    ).bind(username, passwordHash).first();

    if (!user) {
        return jsonResponse({ error: 'Identifiants incorrects' }, 401, corsHeaders);
    }

    // Generate a simple JWT-like token
    const token = await generateToken(user, env.JWT_SECRET || 'ddc-default-secret');

    return jsonResponse({ token, user: { id: user.id, username: user.username } }, 200, corsHeaders);
}

async function generateToken(user, secret) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: user.id,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h expiry
    }));

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${header}.${payload}`)
    );

    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${header}.${payload}.${signature}`;
}

async function verifyAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false };
    }

    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    try {
        const payload = JSON.parse(atob(parts[1]));

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return { valid: false };
        }

        // Verify signature
        const secret = env.JWT_SECRET || 'ddc-default-secret';
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Decode the signature from base64url
        let sig = parts[2].replace(/-/g, '+').replace(/_/g, '/');
        while (sig.length % 4) sig += '=';
        const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));

        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            sigBytes,
            encoder.encode(`${parts[0]}.${parts[1]}`)
        );

        return { valid, user: payload };

    } catch {
        return { valid: false };
    }
}


// =========================================
// CRUD OPERATIONS
// =========================================

// Allowed columns per table (whitelist to prevent SQL injection)
const TABLE_COLUMNS = {
    news: ['title', 'excerpt', 'content', 'image_url', 'date', 'status'],
    events: ['title', 'description', 'image_url', 'date', 'location', 'status'],
    publications: ['title', 'excerpt', 'type', 'date', 'pages', 'url'],
};

const VALID_TABLES = ['news', 'events', 'publications'];

async function getPublicNews(db, corsHeaders) {
    const results = await db.prepare(
        "SELECT id, title, excerpt, image_url, date FROM news WHERE status = 'published' ORDER BY date DESC LIMIT 50"
    ).all();
    return jsonResponse(results.results, 200, corsHeaders);
}

async function getPublicEvents(db, corsHeaders) {
    const results = await db.prepare(
        "SELECT id, title, description, image_url, date, location, status FROM events WHERE status != 'draft' ORDER BY date DESC LIMIT 50"
    ).all();
    return jsonResponse(results.results, 200, corsHeaders);
}

async function getPublicPublications(db, corsHeaders) {
    const results = await db.prepare(
        "SELECT id, title, excerpt, type, date, pages, url FROM publications ORDER BY date DESC LIMIT 50"
    ).all();
    return jsonResponse(results.results, 200, corsHeaders);
}

async function getById(db, table, id, corsHeaders) {
    if (!VALID_TABLES.includes(table)) {
        return jsonResponse({ error: 'Table invalide' }, 400, corsHeaders);
    }
    const result = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
    if (!result) {
        return jsonResponse({ error: 'Non trouvé' }, 404, corsHeaders);
    }
    return jsonResponse(result, 200, corsHeaders);
}

async function createItem(request, db, table, corsHeaders) {
    if (!VALID_TABLES.includes(table)) {
        return jsonResponse({ error: 'Table invalide' }, 400, corsHeaders);
    }

    const body = await request.json();
    const columns = TABLE_COLUMNS[table];
    const validData = {};

    for (const col of columns) {
        if (body[col] !== undefined) {
            validData[col] = body[col];
        }
    }

    if (!validData.title) {
        return jsonResponse({ error: 'Le titre est requis' }, 400, corsHeaders);
    }

    const keys = Object.keys(validData);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => validData[k]);

    const result = await db.prepare(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    return jsonResponse({ id: result.meta.last_row_id, ...validData }, 201, corsHeaders);
}

async function updateItem(request, db, table, id, corsHeaders) {
    if (!VALID_TABLES.includes(table)) {
        return jsonResponse({ error: 'Table invalide' }, 400, corsHeaders);
    }

    const body = await request.json();
    const columns = TABLE_COLUMNS[table];
    const updates = [];
    const values = [];

    for (const col of columns) {
        if (body[col] !== undefined) {
            updates.push(`${col} = ?`);
            values.push(body[col]);
        }
    }

    if (updates.length === 0) {
        return jsonResponse({ error: 'Aucune donnée à mettre à jour' }, 400, corsHeaders);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return jsonResponse({ id, updated: true }, 200, corsHeaders);
}

async function deleteItem(db, table, id, corsHeaders) {
    if (!VALID_TABLES.includes(table)) {
        return jsonResponse({ error: 'Table invalide' }, 400, corsHeaders);
    }

    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return jsonResponse({ id, deleted: true }, 200, corsHeaders);
}


// =========================================
// UTILITIES
// =========================================

function extractId(path, prefix) {
    if (!path.startsWith(prefix)) return null;
    const id = path.substring(prefix.length);
    return id && !isNaN(id) ? parseInt(id) : null;
}

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        }
    });
}
