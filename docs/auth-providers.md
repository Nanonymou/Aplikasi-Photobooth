# Social sign-in providers

Everything Supabase needs is in `supabase/config.toml` and applied with
`supabase config push`. What cannot live there is the half that belongs to
Google and Apple: their consoles issue the credentials, and this is the record
of what to set where, so the next person does not rediscover it.

Both providers redirect to **Supabase's** callback, not the app's:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Supabase then bounces the browser to `/masuk-sosial/callback`, which is in the
redirect allow-list in `config.toml`. Getting this backwards — putting the app's
path in the provider console — is the usual cause of `redirect_uri_mismatch`.

## Google

1. Google Cloud console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. Authorised redirect URI: the Supabase callback above.
3. Copy the client id and secret into the environment:

   ```
   SUPABASE_AUTH_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   SUPABASE_AUTH_GOOGLE_SECRET=…
   ```

The OAuth consent screen needs the app name, a support email, and — once the
app leaves testing — verification. Only the `email` and `profile` scopes are
requested; a photobooth has no business asking for anything else.

## Apple

Apple is more involved, and the difference that catches people out is that
**there is no static client secret**. What Apple gives you is a `.p8` signing
key; the "secret" is a JWT you sign with it, valid for at most six months.

1. Apple Developer → **Certificates, Identifiers & Profiles**.
2. Create an **App ID**, then a **Services ID** — the Services ID is what goes
   in `SUPABASE_AUTH_APPLE_CLIENT_ID`, *not* the App ID.
3. On the Services ID, enable *Sign in with Apple* and add:
   - Domain: `framestudio.id`
   - Return URL: the Supabase callback above.
4. Create a **Sign in with Apple key**, download the `.p8` (Apple lets you
   download it exactly once), and note the Key ID and your Team ID.
5. Mint the client secret and put it in the environment:

   ```
   node scripts/apple-client-secret.mjs \
     --team-id ABCDE12345 \
     --key-id FGHIJ67890 \
     --services-id id.framestudio.signin \
     --key ./AuthKey_FGHIJ67890.p8
   ```

   ```
   SUPABASE_AUTH_APPLE_CLIENT_ID=id.framestudio.signin
   SUPABASE_AUTH_APPLE_SECRET=<the JWT the script prints>
   ```

Because the JWT expires, this is a recurring chore, not a one-off: re-run the
script and redeploy before six months are up, or Apple sign-in fails for
everyone at once with an unhelpful `invalid_client`.

## Verifying

After `supabase config push`, the providers should appear enabled:

```
supabase projects api-keys --project-ref <ref>   # sanity: linked to the right project
curl -s "https://<project-ref>.supabase.co/auth/v1/settings" | jq .external
```

`external.google` and `external.apple` both reporting `true` means Supabase has
the credentials; a provider that is enabled in config but missing its secret
reports `false`.
