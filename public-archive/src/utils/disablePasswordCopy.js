/**
 * Global Anti-Copy Protection for Password Fields (Public Archive)
 * 
 * Prevents copying, cutting, dragging, right-click context menu,
 * and keyboard shortcuts (Ctrl+C, Cmd+C, Ctrl+X, Cmd+X, Ctrl+Insert)
 * on all password input fields across the application, even when
 * the password is made visible via "Show/Hide" toggle.
 */

export function isPasswordInput(el) {
  if (!el || el.tagName !== 'INPUT') return false;

  // 1. Explicitly marked
  if (
    el.dataset?.isPassword === 'true' ||
    el.dataset?.noCopy === 'true' ||
    el.getAttribute('data-is-password') === 'true' ||
    el.getAttribute('data-no-copy') === 'true' ||
    el.getAttribute('data-password') === 'true'
  ) {
    return true;
  }

  // 2. Type is currently password
  const type = (el.type || el.getAttribute('type') || '').toLowerCase();
  if (type === 'password') {
    if (el.dataset) el.dataset.isPassword = 'true';
    return true;
  }

  // 3. Name or ID attribute
  const name = (el.name || '').toLowerCase();
  const id = (el.id || '').toLowerCase();
  if (/pass(word)?|pwd/i.test(name) || /pass(word)?|pwd/i.test(id)) {
    if (el.dataset) el.dataset.isPassword = 'true';
    return true;
  }

  // 4. Placeholder
  const placeholder = (el.placeholder || '').toLowerCase();
  if (/password/i.test(placeholder)) {
    if (el.dataset) el.dataset.isPassword = 'true';
    return true;
  }

  // 5. Autocomplete attribute
  const autocomplete = (el.autocomplete || el.getAttribute('autocomplete') || '').toLowerCase();
  if (autocomplete.includes('password')) {
    if (el.dataset) el.dataset.isPassword = 'true';
    return true;
  }

  // 6. Aria-label attribute
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  if (/password/i.test(ariaLabel)) {
    if (el.dataset) el.dataset.isPassword = 'true';
    return true;
  }

  // 7. Contextual checks (parent container, label, or toggle button)
  const container = el.closest('div, form, label, .relative');
  if (container) {
    // Check nearby label
    const labels = container.querySelectorAll('label');
    for (const lbl of labels) {
      if (/password/i.test(lbl.textContent || '')) {
        if (el.dataset) el.dataset.isPassword = 'true';
        return true;
      }
    }
    // Check nearby toggle button ("Show" / "Hide" / "Toggle Password")
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      const txt = (btn.textContent || '').trim().toLowerCase();
      const title = (btn.title || btn.getAttribute('aria-label') || '').toLowerCase();
      if (
        txt === 'show' ||
        txt === 'hide' ||
        title.includes('password') ||
        title.includes('toggle')
      ) {
        if (el.dataset) el.dataset.isPassword = 'true';
        return true;
      }
    }
  }

  return false;
}

export function setupPasswordCopyPrevention() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const handleCopyOrCut = (e) => {
    const target = e.target;
    const active = document.activeElement;
    if (isPasswordInput(target) || isPasswordInput(active)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) {
        e.clipboardData.clearData();
        try {
          e.clipboardData.setData('text/plain', '');
        } catch (_) {}
      }
      return false;
    }
  };

  // Block copy and cut in capture phase
  document.addEventListener('copy', handleCopyOrCut, true);
  window.addEventListener('copy', handleCopyOrCut, true);
  document.addEventListener('cut', handleCopyOrCut, true);
  window.addEventListener('cut', handleCopyOrCut, true);

  // Block context menu (right click) on password inputs
  const handleContextMenu = (e) => {
    if (isPasswordInput(e.target) || isPasswordInput(document.activeElement)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  document.addEventListener('contextmenu', handleContextMenu, true);
  window.addEventListener('contextmenu', handleContextMenu, true);

  // Block keyboard shortcuts (Ctrl+C, Cmd+C, Ctrl+X, Cmd+X, Ctrl+Insert, Shift+Delete)
  const handleKeyDown = (e) => {
    if (!isPasswordInput(e.target) && !isPasswordInput(document.activeElement)) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const key = (e.key || '').toLowerCase();

    if (isCtrlOrMeta && (key === 'c' || key === 'x' || key === 'insert')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (e.shiftKey && (key === 'delete' || key === 'insert')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  document.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keydown', handleKeyDown, true);

  // Block drag & drop of password text
  const handleDragStart = (e) => {
    if (isPasswordInput(e.target) || isPasswordInput(document.activeElement)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  document.addEventListener('dragstart', handleDragStart, true);

  // Block selection highlight via mouse drag
  const handleSelectStart = (e) => {
    if (isPasswordInput(e.target) || isPasswordInput(document.activeElement)) {
      e.preventDefault();
      return false;
    }
  };
  document.addEventListener('selectstart', handleSelectStart, true);

  // Tag inputs and attach direct inline guards
  const tagPasswordInputs = () => {
    try {
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input) => {
        if (isPasswordInput(input)) {
          if (input.dataset) {
            input.dataset.isPassword = 'true';
            input.dataset.noCopy = 'true';
          }
          input.setAttribute('data-is-password', 'true');
          input.setAttribute('data-no-copy', 'true');
          input.setAttribute('data-password', 'true');
          input.oncopy = (ev) => { ev.preventDefault(); return false; };
          input.oncut = (ev) => { ev.preventDefault(); return false; };
          input.oncontextmenu = (ev) => { ev.preventDefault(); return false; };
        }
      });
    } catch (_) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tagPasswordInputs);
  } else {
    tagPasswordInputs();
  }

  // Continuously tag dynamic inputs via MutationObserver
  try {
    const observer = new MutationObserver(() => {
      tagPasswordInputs();
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'name', 'placeholder']
    });
  } catch (_) {}
}
