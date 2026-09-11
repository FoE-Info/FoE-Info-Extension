# Frontend Security Implementation Playbook

A practical checklist and implementation guide for DOM XSS prevention and Content Security Policy (CSP) enforcement.

---

## 1. DOM XSS Prevention Checklist

### Dangerous Sinks to Avoid or Guard
- [ ] **Avoid `innerHTML`, `outerHTML`, and `insertAdjacentHTML` with dynamic data**:
  - Prefer `element.textContent = data;` for plain text.
  - Use `document.createElement()`, `element.setAttribute()`, and `element.appendChild()` for DOM building.
- [ ] **Sanitize Required HTML with DOMPurify**:
  - If dynamic markup is mandatory, sanitize before assignment:
    ```javascript
    import DOMPurify from 'dompurify';
    element.innerHTML = DOMPurify.sanitize(untrustedHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'span'],
      ALLOWED_ATTR: ['href', 'title', 'class', 'target']
    });
    ```
- [ ] **Safe URL Handling in Links and Attributes**:
  - Check protocols before assigning to `href`, `src`, or `formAction`:
    ```javascript
    function isSafeUrl(url) {
      try {
        const parsed = new URL(url, window.location.origin);
        return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }
    ```
  - Always enforce `rel="noopener noreferrer"` on external links (`target="_blank"`).
- [ ] **Never Use Execution Sinks**:
  - Do NOT use `eval()`, `new Function()`, `setTimeout(string, ...)`, `setInterval(string, ...)`.
  - Pass functions directly to timer APIs: `setTimeout(() => fn(), delay)`.
- [ ] **Context-Aware Encoding**:
  - Ensure data placed in HTML attributes, JSON-in-HTML blocks, or JavaScript variables is contextually encoded.

---

## 2. Content Security Policy (CSP) Checklist

### Baseline Policy Directives
- [ ] **Default Restrictive Fallback**:
  - `default-src 'self'` prevents loading unauthorized external resources.
- [ ] **Script Execution Controls**:
  - Avoid `'unsafe-inline'` and `'unsafe-eval'`.
  - Manifest V3 extensions forbid remote code; use packaged scripts:
    ```http
    script-src 'self'; object-src 'none';
    ```
  - For server-rendered pages, use cryptographically secure nonces or SHA hashes:
    ```http
    script-src 'self' 'nonce-{RANDOM_BASE64}';
    ```
- [ ] **Style Controls**:
  - Restrict stylesheets: `style-src 'self' 'unsafe-inline';` (or nonce-based styles if inline CSS is removed).
- [ ] **Framing & Embedding (Clickjacking Prevention)**:
  - Block framing from other domains:
    ```http
    frame-ancestors 'none'; /* or 'self' */
    ```
- [ ] **Object & Form Protections**:
  - `object-src 'none';` (disables plugins like Flash/Java).
  - `base-uri 'self';` (prevents malicious `<base>` hijacking).
  - `form-action 'self';` (restricts destinations for form submissions).

---

## 3. Chrome Extension & Client-Side Verification

- [ ] **Manifest V3 Content Security Policy**:
  - Verify `manifest.json` specifies valid extension CSP:
    ```json
    "content_security_policy": {
      "extension_pages": "script-src 'self'; object-src 'self';"
    }
    ```
- [ ] **Inter-Process & Event Message Validation**:
  - Validate `message.type`, schema, and sender (`sender.id === chrome.runtime.id`) for all extension messaging handlers.
  - Guard `window.postMessage` handlers by validating `event.origin` and filtering unexpected message payloads.
- [ ] **Automated Linting & Checks**:
  - Use ESLint plugins (`eslint-plugin-security`, `eslint-plugin-no-unsanitized`) to catch DOM sinks during build time.
