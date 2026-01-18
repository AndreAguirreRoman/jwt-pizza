# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      |        home.tsx            |        none           |       none       |
| Register new user<br/>(t@jwt.com, pw: test)         |          register.tsx          |      [POST]/api/auth             |    INSERT into user (name,email, passowrd) VALUES (?,?,?) INSERT into userRole (userId, role, objectId) VALUES (?,?,?)         |
| Login new user<br/>(t@jwt.com, pw: test)            |         login.tsx           |        [PUT]/api/auth           |      SELECT * FROM users WHERE email = ?     and continues with INSERT INTO auth (token, userId) VALUES (?, ?) ...      |
| Order pizza                                         |           menu.tsx         |           [POST]/api/order        |     INSERT INTO order (franchiseId ,storeId, userId) VALUES (?, ?, ?); INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?, ?, ?, ?);          |
| Verify pizza                                        |            delivery.tsx        |          [POST]/api/order/verify         |        Exterbak servuce or none      |
| View profile page                                   |         dinerDashboard.tsx           |      [GET]/api/user/me and then [GET]/api/order             |      SELECT * FROM user WHERE id = ?; SELECT * FROM order WHERE userId = ?;        |
| View franchise<br/>(as diner)                       |           franchiseDashboard.tsx         |        none          |       none    |
| Logout                                              |           logout.tsx         |           [DELETE]/api/auth        |       DELETE FROM auth WHERE token=?       |
| View About page                                     |          about.tsx         |            none       |    none          |
| View History page                                   |            history.tsx        |       none           |      none        |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |             login.tsx       |                 [PUT]/api/auth           |      SELECT * FROM users WHERE email = ?     and continues with INSERT INTO auth (token, userId) VALUES (?, ?) ...       |
| View franchise<br/>(as franchisee)                  |             franchiseDashboard.tsx       |       [GET]/api/franchise/:userId             |       SELECT * FROM franchise WHERE adminId = ?;          |
| Create a store                                      |            createStore.tsx        | [POST]/api/franchise/:franchiseId/store                  |     INSERT INTO store (franchiseId, name) VALUES (?, ?);         |
| Close a store                                       |             closeStore.tsx       |    [DELETE]/api/franchise/:franchiseId/store/:storeId         |       DELETE FROM store WHERE id = ?;       |
| Login as admin<br/>(a@jwt.com, pw: admin)           |            login.tsx        |            [PUT]/api/auth           |      SELECT * FROM users WHERE email = ?     and continues with INSERT INTO auth (token, userId) VALUES       |
| View Admin page                                     |           adminDashboard.tsx         |    [GET]/api/franchise              |      SELECT * FROM franchise;        |
| Create a franchise for t@jwt.com                    |             createFranchise.tsx       |     [POST]/api/franchise              |       INSERT INTO franchise (name, adminId) VALUES (?, ?);       |
| Close the franchise for t@jwt.com                   |              closeStore.tsx      |            [DELETE]/api/franchise/:franchiseId      |      DELETE FROM franchise WHERE id = ?;        |



	

