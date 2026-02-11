import { test, expect } from 'playwright-test-coverage';

async function basicInit(page) {
  let loggedInUser;

  const validUsers = {
    'd@jwt.com': {
      id: '3',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      password: 'a',
      roles: [{ role: 'diner' }]
    },
    'a@jwt.com': {
      id: '3',
      name: 'Admin Chadmin',
      email: 'a@jwt.com',
      password: 'a',
      roles: [{ role: 'admin' }]
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
    expect(route.request().method()).toBe('GET');
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

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      json: {
        franchises: [
          { id: 2, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }, { id: 5, name: 'Springville' }] },
          { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
        ],
      },
    });
  });

  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('POST');
    const orderReq = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' },
    });
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
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
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
  await page.getByPlaceholder('Password').fill('a');
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


