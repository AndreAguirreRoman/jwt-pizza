# Deliverable 12

> Partner:




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
| Corrections | In the orderRouter, I made sure to request the pizza menu from the database, and compare it with the body, if it was not the same, the order will not be sent. If there is an ID, the order will replace the corrupted name and price to the correct one. |

### Attack 2

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | Insert a wrong description in the pizza order to get location of the files |
| Classification | Injection |
| Severity | 3 |
| Description | There was a direct description of where the files were located and now the intruder has the files information, possibly finding more vulnerabilities |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | Fixed the error handling to catch this exception to fix the faulty error message.|


### Attack 3

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | website |
| Classification | Get user data without authorization token |
| Severity | 5 |
| Description | Get users endpoint showed all the users in the database without any sort of authentication |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | Fixed the getUsers in userRouter to ask for validation so only admins get access to the users. |

### Attack 4

| Item | Result |
| :--- | :--- |
| Date | April 10, 2026 |
| Target | website |
| Classification | Update other franchises without the authorization, changing the FranchiseID |
| Severity | 0 |
| Description | Nothing happened! |
| Images | <img src="image-url.png" width="250"><br>description. |
| Corrections | No need to change, the program successfully rejects the change if not authorized! |


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
