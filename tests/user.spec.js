import { test, expect } from 'playwright-test-coverage';

/**
 * Minimal backend mock for:
 * - POST/PUT/DELETE /api/auth
 * - GET /api/user/me
 * - PUT /api/user/:userId
 * - GET /api/user?page&limit&name
 * - DELETE /api/user/:userId
 *
 * Plus tiny mocks so the UI doesn't explode:
 * - GET /api/order (history)
 * - GET /api/franchise/:userId (franchise page)
 * - GET /api/franchise (admin dashboard franchises list)
 */
async function mockBackend(page) {
  // in-memory "DB"
  const users = new Map(); // key: email -> userRecord
  const usersById = new Map(); // key: id -> userRecord
  let nextUserId = 10;

  // Seed users that your app expects
  seedUser({
    id: '1',
    name: 'pizza Francois',
    email: 'a@jwt.com',
    password: 'admin',
    roles: [{ role: 'admin' }],
  });

  seedUser({
    id: '2',
    name: 'Frank Franchisee',
    email: 'f@jwt.com',
    password: 'franchisee',
    roles: [{ role: 'franchisee', objectId: '4' }],
  });

  // helper
  function seedUser(u) {
    const user = { ...u };
    users.set(user.email, user);
    usersById.set(String(user.id), user);
  }

  function authHeader(req) {
    return req.headers()['authorization'] || '';
  }

  function requireAuth(req) {
    const auth = authHeader(req);
    return auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  }

  function makeToken(email) {
    return `token:${email}`;
  }
  function tokenToEmail(token) {
    if (!token || !token.startsWith('token:')) return null;
    return token.slice('token:'.length);
  }

  function currentUserFromReq(req) {
    const token = requireAuth(req);
    const email = tokenToEmail(token);
    if (!email) return null;
    return users.get(email) || null;
  }

  await page.route(/\/api\/auth(\?.*)?$/, async (route) => {
    const req = route.request();
    const method = req.method();
    const body = (req.postDataJSON && req.postDataJSON()) || {};

    // Register
    if (method === 'POST') {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return route.fulfill({ status: 400, json: { message: 'name, email, and password are required' } });
      }
      if (users.has(email)) {
        return route.fulfill({ status: 409, json: { message: 'User already exists' } });
      }

      const newUser = {
        id: String(nextUserId++),
        name,
        email,
        password,
        roles: [{ role: 'diner' }],
      };
      seedUser(newUser);

      return route.fulfill({
        status: 200,
        json: { user: stripPassword(newUser), token: makeToken(email) },
      });
    }

    if (method === 'PUT') {
      const { email, password } = body;
      const u = users.get(email);
      if (!u || u.password !== password) {
        return route.fulfill({ status: 404, json: { message: 'unknown user' } });
      }
      return route.fulfill({
        status: 200,
        json: { user: stripPassword(u), token: makeToken(email) },
      });
    }

    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { message: 'logged out' } });
    }

    return route.fulfill({ status: 405, json: { message: 'Method not allowed' } });
  });

  await page.route(/\/api\/user\/me(\?.*)?$/, async (route) => {
    const req = route.request();
    const me = currentUserFromReq(req);
    if (!me) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    return route.fulfill({ status: 200, json: stripPassword(me) });
  });

  await page.route(/\/api\/user(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fallback();

    const me = currentUserFromReq(req);
    if (!me) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    if (!hasRole(me, 'admin')) return route.fulfill({ status: 403, json: { message: 'unauthorized' } });

    const url = new URL(req.url());
    const pageParam = Number(url.searchParams.get('page') || '1');
    const limitParam = Number(url.searchParams.get('limit') || '10');
    const nameParam = url.searchParams.get('name') || '*';

    // simple name filter: "*abc*" => includes "abc"
    const needle = nameParam.replace(/\*/g, '').toLowerCase();

    const all = Array.from(usersById.values())
      .map(stripPassword)
      .filter((u) => (needle ? (u.name || '').toLowerCase().includes(needle) : true))
      .sort((a, b) => Number(a.id) - Number(b.id));

    const start = (pageParam - 1) * limitParam;
    const slice = all.slice(start, start + limitParam);
    const more = start + limitParam < all.length;

    return route.fulfill({ status: 200, json: { users: slice, more } });
  });

  await page.route(/\/api\/user\/\d+(\?.*)?$/, async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    const me = currentUserFromReq(req);
    if (!me) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });

    const match = url.match(/\/api\/user\/(\d+)/);
    const userId = match ? match[1] : null;
    const target = userId ? usersById.get(String(userId)) : null;

    if (!userId || !target) return route.fulfill({ status: 404, json: { message: 'Not found' } });

    // UPDATE
    if (method === 'PUT') {
      const isSelf = String(me.id) === String(target.id);
      const isAdmin = hasRole(me, 'admin');
      if (!isSelf && !isAdmin) return route.fulfill({ status: 403, json: { message: 'unauthorized' } });

      const body = (req.postDataJSON && req.postDataJSON()) || {};

      const newName = body.name ?? target.name;
      const newEmail = body.email ?? target.email;
      const newPassword = body.password ? body.password : target.password;

      // email collision
      if (newEmail !== target.email && users.has(newEmail)) {
        return route.fulfill({ status: 409, json: { message: 'Email already exists' } });
      }

      // persist: update maps
      users.delete(target.email);

      const updated = {
        ...target,
        name: newName,
        email: newEmail,
        password: newPassword,
      };

      users.set(updated.email, updated);
      usersById.set(String(updated.id), updated);

      // return { user, token } like your HttpPizzaService expects
      return route.fulfill({
        status: 200,
        json: { user: stripPassword(updated), token: makeToken(updated.email) },
      });
    }

    // DELETE
    if (method === 'DELETE') {
      // only admin
      if (!hasRole(me, 'admin')) return route.fulfill({ status: 403, json: { message: 'unauthorized' } });

      users.delete(target.email);
      usersById.delete(String(target.id));
      return route.fulfill({ status: 200, json: { message: 'deleted' } });
    }

    return route.fulfill({ status: 405, json: { message: 'Method not allowed' } });
  });

  // --- ORDERS (so dashboard loads) ---
  await page.route(/\/api\/order(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status: 200, json: [] });
    // return empty order history shape used by your UI
    return route.fulfill({ status: 200, json: { dinerId: 'x', orders: [] } });
  });

  // --- FRANCHISE ROUTES (minimal) ---
  await page.route(/\/api\/franchise\/\d+(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status: 405, json: { message: 'Method not allowed' } });

    const me = currentUserFromReq(req);
    if (!me) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });

    // Franchise page for a user: return franchises they own if franchisee
    if (hasRole(me, 'franchisee')) {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: '4',
            name: 'FrankPizza',
            admins: [{ email: me.email, id: me.id, name: me.name }],
            stores: [{ id: '8', name: 'Provo', totalRevenue: 0 }],
          },
        ],
      });
    }

    return route.fulfill({ status: 200, json: [] });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status: 405, json: { message: 'Method not allowed' } });

    const me = currentUserFromReq(req);
    if (!me) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });

    // Admin dashboard franchises list
    return route.fulfill({
      status: 200,
      json: {
        franchises: [
          {
            id: '4',
            name: 'FrankPizza',
            admins: [{ email: 'f@jwt.com', id: '2', name: 'Frank Franchisee' }],
            stores: [{ id: '8', name: 'Provo', totalRevenue: 0 }],
          },
        ],
        more: false,
      },
    });
  });

  function stripPassword(u) {
    const { password, ...rest } = u;
    return rest;
  }
  function hasRole(u, roleName) {
    return Array.isArray(u.roles) && u.roles.some((r) => r.role === roleName);
  }
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

// ------------------------- TESTS -------------------------

test('updateUser (name)', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  // open dashboard (initials "pd" for pizza diner)
  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');

  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  // modal closed + UI updated
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // logout/login to verify persistence
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('updateUserEmail', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  const newEmail = `new_${email}`;
  await page.getByRole('textbox').nth(1).fill(newEmail);

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('main')).toContainText(newEmail);

  // verify login with new email
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(newEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText(newEmail);
});

test('updateUserPassword', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  const newPassword = 'diner2';
  await page.getByRole('textbox').nth(2).fill(newPassword);

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  // login with updated password
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(newPassword);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');
});

test('users list (admin) and delete one user', async ({ page }) => {
  // login as admin
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  // go admin dashboard
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

  // the list should include seeded admin and franchisee
  await expect(page.getByRole('cell', { name: 'pizza Francois' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'a@jwt.com' })).toBeVisible();

  // delete the franchisee row (Frank Franchisee)
  await expect(page.getByRole('cell', { name: 'Frank Franchisee' })).toBeVisible();
  await page.getByRole('row', { name: /Frank Franchisee/i }).getByRole('button', { name: 'Delete' }).click();

  // now it should be gone
  await expect(page.getByRole('cell', { name: 'Frank Franchisee' })).toHaveCount(0);
});