# JWT Pizza Penetration Test Report

**Testers:**  RJ Gammoh, Andre Aguirre

**Date of Report:** April 10, 2026 
 
**Targets:** pizza.rjspizza.click, pizza.pizzacs329andre.click

---

### Attack 1 — SQL Injection via updateUser -- Self Attack

| Item | Result |
| --- | --- |
| **Date** | April 10, 2026 |
| **Target** | pizza-service.rjspizza.click |
| **Classification** | Injection (OWASP A03:2021) |
| **Severity** | 3 — High |
| **Description** | The `updateUser` function in `database.js` builds its SQL UPDATE query via string concatenation rather than parameterized queries. Sending `{"email": "x', password='hacked' WHERE id=1 -- ", "name": "x"}` to `PUT /api/user/2` with a valid token caused the injected SQL to execute against the database. The injection successfully modified the admin account password — confirmed by the fact that subsequent login attempts to `a@jwt.com` with both the original password `admin` and the injected password `hacked` both returned `unknown user`, meaning the admin account was permanently locked out. The attack escalated from a regular diner account to corrupting the most privileged account in the system. |

| **Corrections** | Rewrote `updateUser` in `database.js` to use parameterized queries with `?` placeholders, consistent with all other functions in the file. Disabled stack trace exposure in production error responses. |


### images
![Attack 2-1](attack2-1.jpeg)
![Attack 2-2](attack2-2.jpeg)


#### Vulnerable code (before fix)

```js
// database.js — updateUser()
if (email) {
  params.push(`email='${email}'`);  // direct string interpolation — injectable
}
if (name) {
  params.push(`name='${name}'`);    // same issue
}
const query = `UPDATE user SET ${params.join(', ')} WHERE id=${userId}`;
await this.query(connection, query);
```

#### Fixed code (after fix)

```js
// database.js — updateUser()
const params = [];
const values = [];
if (password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  params.push('password=?');
  values.push(hashedPassword);
}
if (email) {
  params.push('email=?');
  values.push(email);
}
if (name) {
  params.push('name=?');
  values.push(name);
}
if (params.length > 0) {
  values.push(userId);
  await this.query(connection, `UPDATE user SET ${params.join(', ')} WHERE id=?`, values);
}
```

### Self attack 2 - Get users without an admin token/unauthorized

---

| Item | Result |
| :--- | :--- |
| Date | April 9, 2026 |
| Target | pizza.rjspizza.click |
| Classification | Exploitation of getting users list without `admin` token or `authorization` |
| Severity | 4 |
| Description| Code used
  ```
  GET /api/user?page=1&limit=1000&name=* HTTP/2
  Host: pizza-service.pizzacs329andre.click
  Sec-Ch-Ua-Platform: "macOS"
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibmFtZSI6InBpenphIGRpbmVyIiwiZW1haWwiOiJkQGp3dC5jb20iLCJyb2xlcyI6W3sicm9sZSI6ImRpbmVyIn1dLCJpYXQiOjE3NzU4NDMzNDN9.ism3gtIeGoNys0mfWooc8QQvDj3foXuCjqzzTVk88v0
  Accept-Language: en-US,en;q=0.9
  Sec-Ch-Ua: "Not-A.Brand";v="24", "Chromium";v="146"
  Content-Type: application/json
  User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
  Accept: */*
  Origin: https://pizza.pizzacs329andre.click
  Referer: https://pizza.pizzacs329andre.click/
  ```
| Item | Result |
| :--- | :--- |
| Images | <img src="peerattack.jpeg" width="850"><br> |
| Corrections | 

On `userRouter.js` in
```
userRouter.get(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {


    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const nameFilter = req.query.name || '*';

    const users = await DB.getUsers(page, limit, nameFilter);

    res.json(users);
  })
);
```

> A fix was added creating a condition to make sure that only admins could get the userlists as shown below

```
if (!req.user.isRole(Role.Admin)){
      return res.status(403).json({message:"Hold your horses! You have no permission"});
    }
```

> This fixed the problem.



# Peer attacks

### Peer attack 1 — Unauthenticated Franchise Delete 

| Item | Result |
| --- | --- |
| **Date** | April 10, 2026 |
| **Target** | pizza-service.pizzacs329andre.click |
| **Classification** | Broken Access Control (OWASP A01:2021) |
| **Severity** | 3 — High |
| **Description** | The `DELETE /api/franchise/:franchiseId` endpoint was missing authentication middleware entirely. Using Burp Suite Repeater, a DELETE request was sent to `/api/franchise/8` with no `Authorization` header. The server responded with HTTP `200 OK` and `{"message": "franchise deleted"}`, confirming that any unauthenticated user on the internet can permanently delete any franchise without credentials of any kind. |
| **Corrections** | Added `authRouter.authenticateToken` middleware and an admin role check to the delete franchise route in `franchiseRouter.js`. The fixed route now requires a valid JWT token and verifies the user holds the `Admin` role before proceeding. |


### images
![Attack 1](attack1.jpeg)


#### Vulnerable code (before fix)

```js
// franchiseRouter.js
franchiseRouter.delete(
  '/:franchiseId',
  asyncHandler(async (req, res) => {
    const franchiseId = Number(req.params.franchiseId);
    await DB.deleteFranchise(franchiseId);
    res.json({ message: 'franchise deleted' });
  })
);
```

#### Fixed code (after fix)

```js
// franchiseRouter.js
franchiseRouter.delete(
  '/:franchiseId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (!req.user.isRole(Role.Admin)) {
      throw new StatusCodeError('unable to delete franchise', 403);
    }
    const franchiseId = Number(req.params.franchiseId);
    await DB.deleteFranchise(franchiseId);
    res.json({ message: 'franchise deleted' });
  })
);
```

## Peer Attack 2

---

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | pizza.rjspizza.click |
| Classification | Exploitation of Pizza Order Posting with a `diner user` token |
| Severity | 3 |
| Description| Code used
  ```
  POST /api/order HTTP/2
  Host: pizza-service.rjspizza.click
  Content-Length: 78
  Sec-Ch-Ua-Platform: "macOS"
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwibmFtZSI6IkhhY2tlciIsImVtYWlsIjoiaEBqd3QuY29tIiwicm9sZXMiOlt7InJvbGUiOiJkaW5lciJ9XSwiaWF0IjoxNzc1ODYxODY1fQ.jSs-qFUS8gWiGtAWPZVlPWBtPLNFBG5PgwspOO0u4T8
  Accept-Language: en-US,en;q=0.9
  Sec-Ch-Ua: "Not-A.Brand";v="24", "Chromium";v="146"
  Content-Type: application/json
  Sec-Ch-Ua-Mobile: ?0
  User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
  Accept: */*
  Origin: https://pizza.rjspizza.click
  Sec-Fetch-Site: same-site
  Sec-Fetch-Mode: cors
  Sec-Fetch-Dest: empty
  Referer: https://pizza.rjspizza.click/
  Accept-Encoding: gzip, deflate, br
  Priority: u=1, i

  {
    "items": "not-an-array",
    "storeId": "abc",
    "franchiseId": null
  }
```
| Item | Result |
| :--- | :--- |
| Images | <img src="peerattack2.jpeg" width="850"><br>
| Corrections | The solution below |
```
const orderReq = req.body;
    if (!orderReq.items || !Array.isArray(orderReq.items) || orderReq.items.length === 0) {
      throw new StatusCodeError('invalid order', 400);
    }
    if (!orderReq.items || !Array.isArray(orderReq.items) || orderReq.items.length > 10) {
      throw new StatusCodeError('We are sorry! Only 10 pizzas per order!', 400);
    }

    const franchises = await DB.getFranchises();
    
    const validFranchise = franchises.find(f => f.id === orderReq.franchiseId);
    if (!validFranchise) {
      throw new StatusCodeError('Invalid Franchise ID', 400);
    }

    const validStore = validFranchise.stores.find(s => s.id === orderReq.storeId);
    if (!validStore) {
      throw new StatusCodeError('Invalid Store ID for this Franchise', 400);
    }
    
    const order = await DB.addDinerOrder(req.user, orderReq);

    const factoryRequestBody = {
      diner: { id: req.user.id, name: req.user.name, email: req.user.email },
      order,
    };
```

> this code fixes the bug by requesting the franchise list, to make sure that when the order is made a valid franchiseID is used, and valid order in the menu is used.

## Combined Summary of Learnings

Each data access point is a potential data leak that should be guarder by multiple layers of authorization, which is different to authentication. Each user authenticated must have clear roles in a system, and be authorized depending on their role. 
No actions should be permitted the user is intended to make changes, which can be achieved by sanitizing inputs, outputs, and creating checks to avoid unintended actors to access sensitive information. Those who fail, will not be only placing their reputation in danger, but potentially damaging other people property. There is a big responsibility and tools like Burp help us check for these vulnerabilities.

---

## Adding my self-attacks report

---
# Self-attack

### Attack 1 

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | Price changes when ordering a pizza, and even the names |
| Classification | Injection |
| Severity | 5 |
| Description | The price was changed and the pizza was registered as successful, possibly having the franchisees lose money. |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | In the orderRouter, I made sure to request the pizza menu from the database, and compare it with the body, if it was not the same, the order will not be sent. If there is an ID, the order will replace the corrupted name and price to the correct one. Had to create a whole new function |

```

  async addDinerOrder(user, order) {
    const connection = await this.getConnection();
    try {
      if (!order.franchiseId || !order.storeId || !Array.isArray(order.items) || order.items.length === 0) {
        throw new StatusCodeError('invalid order', 400);
      }

      const orderResult = await this.query(
        connection,
        `INSERT INTO dinerOrder (dinerId, franchiseId, storeId, date) VALUES (?, ?, ?, now())`,
        [user.id, order.franchiseId, order.storeId]
      );

      const orderId = orderResult.insertId;
      const trustedItems = [];

      for (const item of order.items) {
        if (!item.menuId) {
          throw new StatusCodeError('invalid menu item', 400);
        }

        const menuRows = await this.query(
          connection,
          `SELECT id, description, price FROM menu WHERE id=?`,
          [item.menuId]
        );

        if (menuRows.length === 0) {
          throw new StatusCodeError('invalid menu item', 400);
        }

        const menuItem = menuRows[0];

        await this.query(
          connection,
          `INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?, ?, ?, ?)`,
          [orderId, menuItem.id, menuItem.description, menuItem.price]
        );

        trustedItems.push({
          menuId: menuItem.id,
          description: menuItem.description,
          price: menuItem.price,
        });
      }

      return {
        id: orderId,
        franchiseId: order.franchiseId,
        storeId: order.storeId,
        items: trustedItems,
      };
    } finally {
      connection.end();
    }
  }
```

### Attack 2

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | Insert a wrong description in the pizza order to get location of the files |
| Classification | Injection |
| Severity | 3 |
| Description | There was a direct description of where the files were located and now the intruder has the files information, possibly finding more vulnerabilities |
| Images | <img src="./WhatsApp Image 2026-04-10 at 17.32.45.jpeg" width="250"><br> |
| Corrections | Fixed the error handling to catch this exception to fix the faulty error message.|

```
const start = Date.now();

    const orderReq = req.body;
    if (!orderReq.items || !Array.isArray(orderReq.items) || orderReq.items.length === 0) {
      throw new StatusCodeError('invalid order', 400);
    }
```
### Attack 3

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | website |
| Classification | Get user data without authorization token |
| Severity | 5 |
| Description | Get users endpoint showed all the users in the database without any sort of authentication |
| Images | <img src="./WhatsApp Image 2026-04-10 at 17.32.45.jpeg" width="250"><br>description. |
| Corrections | Fixed the getUsers in userRouter to ask for validation so only admins get access to the users. |


```
   if (!req.user.isRole(Role.Admin)){
      throw new StatusCodeError("Hold your horses! You have no permission")
    }
```


### Attack 4

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | website |
| Classification | Update other franchises without the authorization, deleting other franchises through a modified request of FranchiseID |
| Severity | 5 |
| Description | Other franchisees are able to delete other franchises, meaning that they could exploit the account of one franchisee to delete all the franchises |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | Change made below: |
```
const franchiseId = Number(req.params.franchiseId); #added
```

### Attack 5

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | website |
| Classification | Injection |
| Severity | 3 |
| Description | The website took forever to handle the request, crashed, and didn't register the order as valid. When you go to the order history you will see that the order was purchased, possibly making customers get ghost charges. |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | Added a check in the pizza ordering to limit how many pizzas are purchased at once in OrderRouter |

```
    if (!orderReq.items || !Array.isArray(orderReq.items) || orderReq.items.length > 10) {
      throw new StatusCodeError('We are sorry! Only 10 pizzas per order!', 400);

    }
```







---
# Peer-attack

### Attack 1 

| Item | Result |
| :--- | :--- |
| Date | April 11, 2026 |
| Target | Price changes when ordering a pizza, and even the names |
| Classification | Injection |
| Severity | 5 |
| Description | The price was changed and the pizza was registered as successful, possibly having the franchisees lose money. |
| Images | <img src="./attackprice.jpeg" width="1000"><br>description. |
| Corrections | He planned to create a check on the orderRouter prices, I explained what I did, so he will fix it similarly.
### Attack 2

| Item | Result |
| :--- | :--- |
| Date | April 11, 2026 |
| Target | Insert a wrong description in the pizza order to get location of the files |
| Classification | Injection |
| Severity | 3 |
| Description | There was a direct description of where the files were located and now the intruder has the files information, possibly finding more vulnerabilities |
| Images | <img src="./attackfiles.jpeg" width="1000"><br>description. |
| Corrections | He will fix the error handling


### Attack 3

| Item | Result |
| :--- | :--- |
| Date | April 11, 2026 |
| Target | website |
| Classification | Get user data without authorization token |
| Severity | 0 |
| Description | It didn't work! He successfully protected usersData endpoint |
| Images | <img src="users.png" width="1000"><br>description. |
| Corrections | No need |

### Attack 4

| Item | Result |
| :--- | :--- |
| Date | April 11, 2026 |
| Target | Registration Breaking |
| Classification | Error handling while registering |
| Severity | 3 |
| Description | When sending invalid JSON, the server returns a full error message with a with multiple files locations
| Images | <img src="json.png" width="1000"><br>Server response showing stack trace and error message. |
| Corrections | There needs to be an error handler to hide this information|



### Attack 5

| Item | Result |
| :--- | :--- |
| Date | April 11, 2026 |
| Target | Pizza ordering |
| Classification | Too much data |
| Severity | 4 |
| Description | The website took forever to handle the request, crashed, and didn't register the order as valid. When you go to the order history you will see that the order was purchased, possibly making customers get ghost charges. |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | I don't have the picture for this one, and I can't recreate it, since I don't have access to his account. While he was testing he deleted franchises, so I cant show it. |
