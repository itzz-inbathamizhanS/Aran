# Vercel front doors for Aran Cloud, Bank A and Bank B

Each folder is its own Vercel project (root directory set to the folder). It has no files of
its own: every path is rewritten to the hosted `aran-apps` service on Render, which runs the
three apps behind `scripts/apps_proxy.py` (`/cloud`, `/bank-a`, `/bank-b`). In the browser,
each app still lives at the root of its own address, so its pages keep working unchanged.
If the Render service gets a different address, change it in the three `vercel.json` files.
