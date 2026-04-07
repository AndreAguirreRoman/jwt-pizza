# Incident: 2026-04-07 16-14-00

## Summary




```md


Between the hour of 15:02 and 16:04 on April 7,2026, 100% of users encountered an error preventing them of buying pizzas. The event was triggered by a repeated 500 responses from the pizza factory dependency, which process the pizza creation requests. This change was caused by a chaos injector initiated by the pizza factory.

The failure caused increased latency and failed pizza requests. This event was detected through Grafana. The team resolved the issue by looking at the logs, spotting multiple 500 responses to the pizza factory. The team went inside the service to try and order a pizza, with the console opened, to see the injection disabling prompt. This was a high severity incident affecting all users trying to place orders.
```

## Detection




```md

This incident was detected when the Pizza purchase failure was triggered and Pizza Devops Group were paged.
Andre Aguirre solved the problem by analyzing the logs in Grafana, where multiple POST requests to the factory returned a 500 status code. Upon further analysis, Andre detected the
pizza purchase failure as the possible error, continued to analyze the error in the website trying to create his own order and receiving an error from the factory, by using the terminal to determine which endpoint was causing the error, Andre was able to identify the solution.
```

## Impact




```md


For 1 hour and 2 minutes between 16:04 on April 7,2026, 100% of our users experienced this incident.

This incident affected 2 customers (100% OF ACTIVE USERS), who experienced an error while ordering a pizza. This made the pizza ordering basically unusable.

```

## Timeline



note.

```md


All times are UTC.


- _21:02_ – Chaos injection becomes active (factory status becomes chaotic)
- _21:40_ – Latency and pizza purchase failures begin increasing thanks to traffic generation
- _21:45_ – Grafana alerts triggered due to abnormal metrics
- _21:46_ – Logs show repeated POST /factory requests returning 500 errors
- _21:57_ – Investigation identifies factory dependency as root cause
- _22:04_ – Chaos disabled from JWT Pizza Factory dashboard
- _22:05_ – Metrics stabilize, latency decreases, and failures stop
```

## Response




```md


After alerts were triggered, seconds later an analysis began using Grafana dashboards and logs. Andre identified unusual latency and failure metrics related tp multiple factory errors in the logs.

No escalation was required, Andre disable chaos injection from the JWT pizza factory dashboard
```

## Root cause




```md


The root cause was a chaos injection of ChaosMonkey from the Pizza Factory system, to test the system. This cause the factory endpoint to malfunction and provide a 500 response.
```

## Resolution





```md

The issue was solved by disabling the chaos injection from the console after attempting a pizza purchase, there was a link provided to disable the chaos, and a confirmation of the deactivation of chaos inside the pizza factory dashboard was triggered
```

## Prevention


occurred again.

```md

Future incidents of this type can be prevented by adding alerts specifically for the endpoint that makes requests to the factory.
```

## Action items




```md

1. Adding alert for the factory endpoint
1. Add a dashboard visibility for the  metric
1. Document the incident and the steps taken to solve, for future reference
```
