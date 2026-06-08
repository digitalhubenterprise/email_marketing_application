# Advanced Security Hardening Tasks

- [ ] **Backend Security & Credentials Management**
  - [ ] Update `create_access_token` in `security.py` to accept and store `"pws"` password hash claim
  - [ ] Upgrade HTML sanitizer `sanitize_html` in `security.py` with unescaping and strict regexes
  - [ ] Update `get_current_user` in `deps.py` to enforce `"pws"` validation
  - [ ] Update `get_current_admin` in `admin_deps.py` to enforce `"pws"` validation

- [ ] **Backend API Endpoints**
  - [ ] Implement `validate_ssrf_host` in `smtp.py` and enforce in `create_smtp_server` and `test_smtp_connection`
  - [ ] Update `register_admin` in `admin.py` to use `secrets.compare_digest`
  - [ ] Pass password hashes in all `create_access_token` calls in `admin.py`
  - [ ] Pass password hashes in all `create_access_token` calls in `auth.py`

- [ ] **Task Workers & Security Headers**
  - [ ] Add Content-Security-Policy header in `main.py`
  - [ ] Implement Dhru log pruning periodic task in `email_sender.py`

- [ ] **Verification**
  - [ ] Add new unit tests in `test_user_audit.py`
  - [ ] Run backend unit tests and ensure all pass
