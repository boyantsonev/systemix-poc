# Evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | The landing has no T4 flag | rules check on the landing, --surface marketing | 0 T4 | build.test | open |
| E2 | One type scale is defined once, in globals.css | review of the diff | every size the page uses is a named step | product.design | open |
| E3 | The scale has at most 8 steps | review of the diff | 8 or fewer | product.design | open |
| E4 | No text on the page changes size noticeably | screenshots before and after, desktop and phone | no difference a reader would notice | build.test | open |
| E5 | Nothing gets smaller than 12px | rules check (A3) | 0 A3 | build.test | open |
| E6 | The app and studio tests still pass | npm test, npm --prefix product-studio test | green | build.test | open |
