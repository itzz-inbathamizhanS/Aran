# Aran Learn 31: Polling and Rate Limits (beginner)

For the whole team. No background needed.

## 1. What is polling?

A web page cannot know that the server has new data unless it asks. **Polling** means the page asks again and again on a timer, for example "give me the latest stats" every 3 seconds. In JavaScript that is `setInterval(fn, 3000)`.

Polling is simple, but every ask is a full HTTP request. Five timers on one page, each firing every few seconds, is more than one request a second, all day, for every open tab.

## 2. Where the requests go on our live links

```
your browser  ->  aran-console.vercel.app  ->  aran-console.onrender.com
                  (Vercel "rewrite")            (the real Aran server)
```

Vercel only forwards `/api/...` calls to Render. Each forwarded call counts against Vercel's free (Hobby) plan limits, and Render's free server has to answer all of them on one small machine. Ten people leaving the console open for an hour sent about 40,000 requests before this fix.

## 3. What a rate limit is

A **rate limit** is a rule like "at most 300 requests a minute per key". Past it, the server answers **HTTP 429 Too Many Requests**, often with a `Retry-After: 30` header that says how many seconds to wait. A polite client waits that long instead of retrying straight away (that would only make it worse).

## 4. Four tricks we used

| Trick | What it means | In Aran |
|---|---|---|
| Batch | Ask for many things in one request | `GET /api/live?parts=stats,events,immune` replaces 3 to 5 separate calls |
| Slow down | Ask less often when seconds do not matter | 5 s instead of 3 s; Merkle log and customers every 20 s |
| Stop when nobody looks | Hidden tab or no mouse/keyboard for 10 minutes = no polling | `U.active()` in `app/ui/js/ui.js` |
| Back off | On 429, wait `Retry-After` seconds | `A.pauseUntil` in `app/ui/js/data.js` |

## 5. Try it yourself

1. Open the console, press F12, open the **Network** tab and filter on `api`.
2. Count the requests in one minute. You should see about 12 calls to `/api/live`.
3. Switch to another tab for a minute and come back: nothing was sent while you were away, and one call goes out the moment you return.

## 6. Words to remember

- **Polling**: asking again on a timer.
- **Push** (the alternative): the server sends updates itself (WebSockets, Server-Sent Events). Aran Cloud's dashboard already uses a stream.
- **429**: "too many requests".
- **Retry-After**: how long the server wants you to wait.
- **Idle**: nobody has touched the page for a while.
