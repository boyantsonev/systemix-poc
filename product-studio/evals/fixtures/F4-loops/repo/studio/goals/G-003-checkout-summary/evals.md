# Evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | The summary names the plan, the total and the renewal date | review of the checkout | yes | product.design | pass |
| E2 | There is one primary action on the checkout | review C1 | no C1 finding | product.design | pass |
| E3 | The checkout passes the rules check | rules check --changed | pass | build.test | open |
| E4 | A person can say when they will next be charged | 5 observed sessions | 5 of 5 | build.test | open |
| E5 | Surprise-renewal tickets go down | evaluations.md row | fewer than 3 a month | build.measure | open |
