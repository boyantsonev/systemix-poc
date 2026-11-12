# Evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | The email names the plan, amount and renewal date in the first two lines | review of the email | yes | product.design | open |
| E2 | The email passes the rules check for the email surface | rules check --surface email | pass | build.test | open |
| E3 | There is a one-click unsubscribe | review E1 | yes | build.test | open |
| E4 | A person can say when they will be charged after reading it once | 5 observed reads | 5 of 5 | build.test | open |
| E5 | Surprise-renewal tickets per month | support export | fewer than 3 | build.measure | open |
