# Aran Learn 29 · Real Data Paths, Not Demo Data

For the team: Inbathamizhan S, Aasif Ahmed A, SN Arun Vijay, Bharadhwaj M. Read this before the "make every feature work for real" change. It takes about ten minutes.

## 1. What "demo data" means

A website shows **demo data** when a button or a background job makes up numbers, customers or payments so the page looks busy. Examples we had in Aran:

| Where | What it did | Why it is a problem |
|---|---|---|
| Aran Cloud dashboard | "Add demo transactions" wrote 200 made-up payments | The charts showed traffic no bank ever sent |
| Bank A and Bank B | A timer created a random payment every 15 seconds | Visitors saw payments nobody made |
| Bank A and Bank B | "Run the day" made 20 random payments at once | Same as above, on a button |
| Bank A and Bank B | 8 customers were created by the server on start | Customers nobody signed up |
| Console presenter mode | When the server was down, it replayed old saved answers | The page looked live when it was not |

A **real data path** is the opposite: every value on the screen came from something a person (or a connected system) actually did, and went through the same code a real bank would use.

## 2. The rule we follow now

> Nothing appears on a page unless a person or a connected system sent it through the real API.

So:

1. **Empty is honest.** A new bank has no customers. A new Cloud workspace has 0 transactions. The page says so and shows the next step ("Open an account", "Send your first transaction").
2. **Every button calls the real back end.** If the back end is asleep or broken, the page says that. It never shows saved or invented answers instead.
3. **Test identities are still generated.** We must never ask people to type their real Aadhaar, PAN or card number into a student project. So the sign-up form has a "Fill a test identity" button that makes checksum-valid numbers that belong to no one. The *flow* is real (the bank stores them, Aran tokenises them, erasure shreds them); only the *person* is not.

## 3. How the pieces now connect

```
You (browser)
  │  open an account, send money, approve a held payment
  ▼
Bank B  ──SDK──▶  Aran Cloud  ──▶  Aran core (firewall engine)
  │                    │                  │
  │  stores tokens     │  meters, charts   │  detects, tokenises,
  │  only              │  each transaction │  traces, erases
  ▼                    ▼                  ▼
Bank B pages       Cloud dashboard     Console pages
```

Bank A runs the same bank code without Aran, so you can compare what each bank stores after doing the same thing in both.

## 4. Words you will see

- **Seed / seeding**: filling a database with starting rows. We removed automatic seeding of customers and payments.
- **Opening deposit**: the money a customer puts in when they open an account. You type it on the sign-up form; it is no longer a random amount.
- **Empty state**: what a page shows when there is nothing yet. It should explain why and give one clear next step.
- **Background job**: code that runs on a timer without anyone clicking. We kept only the useful one (Bank B retries sending copies to Aran Cloud if Cloud was asleep).
- **Cold start**: free hosting (Render) sleeps after 15 minutes. The first visit wakes it, which takes up to a minute. The site shows a "waking" page; it does not fake data while it waits.
- **Ephemeral storage**: Render's free plan has no disk that survives a restart, so after a restart the banks and Cloud start empty again. That is real behaviour, not a bug in our code.

## 5. Try it yourself (5 minutes)

1. Open Bank B, go to **Customers & KYC**, press **Fill a test identity**, set an opening deposit, and open the account.
2. Open a second account the same way.
3. Go to **Send money** and send from the first customer to the second.
4. Open the Aran Cloud dashboard for Bank B's workspace: the transaction you just made is there, with its identifiers tokenised.
5. Do the same in Bank A and press **Side by side** to compare what each bank stored.

## 6. Check yourself

1. Why is an empty dashboard better than one full of generated payments?
2. Why do we still generate test Aadhaar numbers instead of asking for real ones?
3. What should a page do when the server is asleep?
