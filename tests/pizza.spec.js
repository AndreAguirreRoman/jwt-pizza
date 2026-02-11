import { test, expect } from 'playwright-test-coverage';

async function basicInit(page) {
  let loggedInUser;

  const validUsers = {
    'd@jwt.com': {
      id: '1',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      password: 'd',
      roles: [{ role: 'diner' }]
    },
    'a@jwt.com': {
      id: '2',
      name: 'Admin Chadmin',
      email: 'a@jwt.com',
      password: 'a',
      roles: [{ role: 'admin' }]
    },
    'f@jwt.com': {
      id: '3',
      name: 'Frank Franchisee',
      email: 'f@jwt.com',
      password: 'f',
      roles: [{ role: 'franchisee' }]
    },
  };

  await page.route('*/**/api/auth', async (route) => {
    const req = route.request();
    const method = req.method();

    const body = req.postDataJSON?.() ?? {};



    if (method === 'POST') {
  
  
      const email = body.email;
      const name = body.name ?? body.fullName ?? body.full_name ?? 'New User';
      const password = body.password;

  
      if (validUsers[email]) {
        await route.fulfill({ status: 409, json: { error: 'User already exists' } });
        return;
      }

      const newUser = {
        id: String(Object.keys(validUsers).length + 10),
        name,
        email,
        password,
        roles: [{ role: 'diner' }],
      };

      validUsers[email] = newUser;
      loggedInUser = newUser;

      const registerRes = { user: loggedInUser, token: 'abcdef' };
      await route.fulfill({ status: 200, json: registerRes });
      return;
    }

    if (method === 'PUT') {
  
      const user = validUsers[body.email];
      if (!user || user.password !== body.password) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }

      loggedInUser = user;
      const loginRes = { user: loggedInUser, token: 'abcdef' };
      await route.fulfill({ status: 200, json: loginRes });
      return;
    }


    await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    if (!loggedInUser) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    await route.fulfill({ status: 200, json: loggedInUser });
  });


  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ],
    });
  });

  let franchises = [
  { id: 2, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }, { id: 5, name: 'Springville' }] },
  { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
  { id: 4, name: 'FrankPizza', adminEmail: 'f@jwt.com', ownerEmail: 'f@jwt.com', stores: [{ id: 8, name: 'Provo' }] },
];

await page.route(/\/api\/franchise(\/\d+)?(\?.*)?$/, async (route) => {
  const req = route.request();
  const method = req.method();
  const url = req.url();

  if (method === 'GET') {
    await route.fulfill({ status: 200, json: { franchises } });
    return;
  }

  if (method === 'POST') {
    const body = req.postDataJSON?.() ?? {};
    const nextId = franchises.length ? Math.max(...franchises.map((f) => f.id)) + 1 : 1;

    const created = {
      id: nextId,
      name: body.name ?? body.franchiseName ?? body.franchise_name ?? 'Orem',
      stores: [],
    };

    franchises.push(created);

    await route.fulfill({ status: 200, json: { franchise: created } });
    return;
  }

  if (method === 'DELETE') {
    const match = url.match(/\/api\/franchise\/(\d+)/);
    const id = match ? Number(match[1]) : NaN;

    franchises = franchises.filter((f) => f.id !== id);

    await route.fulfill({ status: 200, json: { ok: true } });
    return;
  }

  await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
});


  await page.route('*/**/api/order', async (route) => {
  const req = route.request();
  const method = req.method();

  if (method === 'GET') {
    await route.fulfill({ status: 200, json: [] });
    return;
  }

  if (method === 'POST') {
    const orderReq = req.postDataJSON?.() ?? {};
    await route.fulfill({
      status: 200,
      json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' },
    });
    return;
  }

  await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
});

  await page.goto('/');
}

test('register with mocked backend', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('test');
  await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();
});


test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('d');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('d');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();
});


test('franchise board shows mocked franchises and ssss', async ({ page }) => {
  await basicInit(page);
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Admin');
});


test('Test login and logout', async ({ page }) => {
  await basicInit(page);
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Logout');
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Login');
});


test('login admin, and dashboard', async ({ page }) => {
  await basicInit(page);
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('columnheader', { name: 'Franchise', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();


});


test('login admin, delete add franchise', async ({ page }) => {
  await basicInit(page);
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('columnheader', { name: 'Franchise', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await expect(page.getByText('Create franchise', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'franchise name' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('Orem');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('cell', { name: 'Orem' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).last().click();

  

});




test('login franchisee', async ({ page }) => {
  await basicInit(page);
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('f');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Franchise' }).first().click();


});


test('login diner', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('d');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('navigation', { name: 'Global' })).toBeVisible();
  await page.getByRole('link', { name: 'KC', exact: true }).click();
  await expect(page.getByText('diner', { exact: true })).toBeVisible();
});

test('about page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/about');
  await expect(page.getByRole('main')).toBeVisible();
});

test('history page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/history');
  await expect(page.getByRole('main')).toBeVisible();
});

test('not found page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/some-brokie-route');
  await expect(page.getByRole('main')).toBeVisible();
});
test('delivery page', async ({ page }) => {
  await basicInit(page);
  await page.goto('/delivery');
  await expect(page.getByRole('main')).toBeVisible();
});
